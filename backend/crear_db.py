"""Compatibility entry point: initialize the schema through versioned migrations.
Create PostgreSQL databases and least-privilege roles separately as an operator.
"""
from ejecutar_schema import main

if __name__ == '__main__':
    raise SystemExit(main())
