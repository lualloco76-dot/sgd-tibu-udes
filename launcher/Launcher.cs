using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;

internal static class Program
{
    private const string AppUrl = "http://localhost:3000";

    [STAThread]
    private static int Main(string[] args)
    {
        bool headless = Array.IndexOf(args, "--headless") >= 0;
        bool noBrowser = Array.IndexOf(args, "--no-browser") >= 0;
        string root = FindProject();
        if (root == null)
        {
            if (!headless) MessageBox.Show("Deje este ejecutable en la carpeta del proyecto, junto a backend y frontend, o en la carpeta que los contiene.", "Archivo diocesano", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 2;
        }
        string resultPath = Path.Combine(root, ".test-artifacts", "runtime", "launcher-" + Guid.NewGuid().ToString("N") + ".json");
        int resultIndex = Array.IndexOf(args, "--result");
        if (resultIndex >= 0 && resultIndex + 1 < args.Length) resultPath = Path.GetFullPath(args[resultIndex + 1]);
        if (headless)
        {
            try
            {
                Dictionary<string, object> result = RunStarter(root, resultPath);
                bool ok = result.ContainsKey("ok") && (bool)result["ok"];
                if (ok && !noBrowser) OpenBrowser();
                return ok ? 0 : 1;
            }
            catch { return 1; }
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new LauncherWindow(root, resultPath, !noBrowser));
        return 0;
    }

    private static string FindProject()
    {
        string basePath = AppDomain.CurrentDomain.BaseDirectory;
        foreach (string candidate in new string[] { basePath, Path.Combine(basePath, "parroquia-gestor-documental") })
        {
            if (File.Exists(Path.Combine(candidate, "backend", "app", "main.py")) && File.Exists(Path.Combine(candidate, "frontend", "package.json")) && File.Exists(Path.Combine(candidate, "launcher", "Start-System.ps1"))) return Path.GetFullPath(candidate);
        }
        return null;
    }

    internal static Dictionary<string, object> RunStarter(string root, string resultPath)
    {
        string script = Path.Combine(root, "launcher", "Start-System.ps1");
        string shell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe");
        if (!File.Exists(shell)) throw new InvalidOperationException("No se encontró Windows PowerShell.");
        Directory.CreateDirectory(Path.GetDirectoryName(resultPath));
        var info = new ProcessStartInfo(shell, "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File " + Quote(script) + " -NoBrowser -ResultFile " + Quote(resultPath));
        info.WorkingDirectory = root;
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        using (Process process = Process.Start(info))
        {
            if (!process.WaitForExit(180000))
            {
                process.Kill();
                throw new InvalidOperationException("El inicio tardó demasiado. Revise los registros y vuelva a intentarlo.");
            }
        }
        if (!File.Exists(resultPath)) throw new InvalidOperationException("No se pudo completar el inicio. Revise los archivos de launcher y los registros del proyecto.");
        return new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(resultPath, Encoding.UTF8));
    }

    private static string Quote(string value) { return "\"" + value + "\""; }
    internal static void OpenBrowser() { Process.Start(new ProcessStartInfo(AppUrl) { UseShellExecute = true }); }

    private sealed class LauncherWindow : Form
    {
        private readonly string root;
        private readonly string resultPath;
        private readonly bool autoOpen;
        private readonly Label title = new Label();
        private readonly Label details = new Label();
        private readonly ProgressBar progress = new ProgressBar();
        private readonly Button open = new Button();

        internal LauncherWindow(string root, string resultPath, bool autoOpen)
        {
            this.root = root; this.resultPath = resultPath; this.autoOpen = autoOpen;
            Text = "Archivo diocesano · Tibú";
            ClientSize = new Size(525, 305);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            BackColor = Color.FromArgb(245, 244, 239);
            Font = new Font("Segoe UI", 10);
            AutoScaleMode = AutoScaleMode.Font;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

            var brand = new Label { Text = "DIÓCESIS DE TIBÚ", Location = new Point(28, 23), AutoSize = true, ForeColor = Color.FromArgb(151, 119, 60), Font = new Font("Segoe UI", 9, FontStyle.Bold) };
            title.Text = "Iniciando el sistema…";
            title.SetBounds(26, 53, 475, 38);
            title.Font = new Font("Segoe UI", 19, FontStyle.Regular);
            title.ForeColor = Color.FromArgb(20, 62, 52);
            details.Text = "Preparando backend y frontend.\nComprobando la conexión de PostgreSQL…";
            details.SetBounds(28, 106, 466, 70);
            details.ForeColor = Color.FromArgb(84, 105, 91);
            progress.SetBounds(29, 184, 464, 8);
            progress.Style = ProgressBarStyle.Marquee;
            progress.MarqueeAnimationSpeed = 28;

            open.Text = "Abrir sistema"; open.SetBounds(28, 215, 140, 35); open.Enabled = false;
            open.BackColor = Color.FromArgb(32, 91, 78); open.ForeColor = Color.White; open.FlatStyle = FlatStyle.Flat;
            open.Click += delegate { TryOpen(); };
            var logs = new Button { Text = "Ver registros", Location = new Point(179, 215), Size = new Size(133, 35) };
            logs.Click += delegate { string folder = Path.Combine(root, ".test-artifacts", "runtime"); Directory.CreateDirectory(folder); Process.Start(new ProcessStartInfo(folder) { UseShellExecute = true }); };
            var close = new Button { Text = "Cerrar lanzador", Location = new Point(323, 215), Size = new Size(172, 35) };
            close.Click += delegate { Close(); };
            var note = new Label { Text = "Cerrar esta ventana no detiene los servicios iniciados.", Location = new Point(28, 267), AutoSize = true, ForeColor = Color.FromArgb(109, 125, 112), Font = new Font("Segoe UI", 8) };
            Controls.AddRange(new Control[] { brand, title, details, progress, open, logs, close, note });
            Shown += delegate { BeginStartup(); };
        }

        private void BeginStartup()
        {
            var worker = new BackgroundWorker();
            worker.DoWork += delegate(object sender, DoWorkEventArgs e) { e.Result = RunStarter(root, resultPath); };
            worker.RunWorkerCompleted += delegate(object sender, RunWorkerCompletedEventArgs e)
            {
                if (IsDisposed) return;
                progress.Style = ProgressBarStyle.Continuous;
                progress.Value = 100;
                if (e.Error != null) { ShowFailure(e.Error.Message); return; }
                var result = (Dictionary<string, object>)e.Result;
                if (!(bool)result["ok"]) { ShowFailure(Convert.ToString(result["message"])); return; }
                title.Text = "El sistema está listo";
                details.Text = "Backend y PostgreSQL disponibles.\nFrontend disponible en http://localhost:3000";
                open.Enabled = true;
                if (autoOpen) TryOpen();
            };
            worker.RunWorkerAsync();
        }
        private void ShowFailure(string message)
        {
            title.Text = "Revise el inicio del sistema";
            title.ForeColor = Color.FromArgb(151, 57, 54);
            details.Font = new Font("Segoe UI", 9);
            details.Text = message + "\nUse «Ver registros» para revisar el detalle.";
        }
        private void TryOpen()
        {
            try { OpenBrowser(); }
            catch { MessageBox.Show("Abra http://localhost:3000 en su navegador.", "Sistema disponible", MessageBoxButtons.OK, MessageBoxIcon.Information); }
        }
    }
}
