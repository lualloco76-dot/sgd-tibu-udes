using System;
using System.IO;
using System.Diagnostics;
using System.Text;
using System.Windows.Forms;

static class Launcher {
    static string Quote(string value) {
        var result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') { result.Append('\\', slashes * 2 + 1); result.Append(c); slashes = 0; continue; }
            result.Append('\\', slashes); slashes = 0; result.Append(c);
        }
        result.Append('\\', slashes * 2); result.Append('"'); return result.ToString();
    }
    [STAThread]
    static int Main(string[] args) {
        try {
            string root = AppDomain.CurrentDomain.BaseDirectory;
            var command = new StringBuilder(Quote(Path.Combine(root, "desktop", "runtime.py")));
            foreach (var arg in args) command.Append(" ").Append(Quote(arg));
            var start = new ProcessStartInfo(Path.Combine(root, "runtime", "pythonw.exe"), command.ToString());
            start.WorkingDirectory = root;
            start.UseShellExecute = false; start.CreateNoWindow = true;
            using (var process = Process.Start(start)) { process.WaitForExit(); return process.ExitCode; }
        } catch (Exception error) {
            MessageBox.Show("No se pudo abrir el SGD (" + error.GetType().Name + "). Reinstale el programa. Los datos permanecen fuera de la carpeta de instalación.", "SGD Diócesis de Tibú", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
