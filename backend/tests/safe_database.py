"""Only the named synthetic database may receive test schemas."""
from sqlalchemy.engine import make_url


def test_database_url(value):
    url = make_url(value)
    if url.get_backend_name() != 'postgresql' or url.database != 'sgd_test':
        raise ValueError('TEST_DATABASE_URL debe apuntar exclusivamente a sgd_test')
    return url
