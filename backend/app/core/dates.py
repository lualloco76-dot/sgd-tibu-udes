"""Institutional dates use Colombia (UTC-05:00); persistence remains UTC."""
from datetime import datetime, timedelta, timezone

COLOMBIA = timezone(timedelta(hours=-5), name='America/Bogota')

def today():
    return datetime.now(COLOMBIA).date()

def issued_at(value):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(COLOMBIA).strftime('%d/%m/%Y %H:%M (Colombia)')
