"""
Django settings for core project (SYNAPSE-LAB / ai4life).
Structured similarly to EduMate Backend architecture.
"""

from pathlib import Path
import environ
import os

env = environ.Env(
    DEBUG=(bool, True),
    SECRET_KEY=(str, 'django-insecure-dev-key-change-in-production'),
    ALLOWED_HOSTS=(list, ['*']),
    CORS_ALLOW_ALL_ORIGINS=(bool, True),
)

BASE_DIR = Path(__file__).resolve().parent.parent

# Read .env file if present
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',   # tìm kiếm full-text (kho tri thức)

    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',

    'storages',

    # Local apps
    'core',
    'users',
    'knowledge',     # tài liệu, giáo trình, vector (RAG)
    'anatomy',       # giải phẫu 3D
    'algorithms',    # nội dung giải thích thuật toán
    'learning',      # lịch sử học, chuỗi ngày học
    'classroom',     # lớp học (bạn B)
    'translation',   # dịch tự động (qua service AI) + cache
    'ai_gateway',    # cổng gọi service AI: hạn mức, nhật ký, chi phí
    'tutor',         # gia sư Hỏi AI
    'learner',       # hồ sơ học tập + ôn tập thích ứng
    'feedback',      # góp ý người dùng + trang chất lượng AI
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database configuration: defaults to SQLite, or PostgreSQL via DATABASE_URL
DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}'
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ------------------------------------------------------------
# Lưu file upload (giáo trình PDF...)
# - Có S3_BUCKET trong .env  -> lưu lên AWS S3 hoặc storage tương thích S3
# - Không có                 -> lưu local trong be/media/ (tiện khi dev)
# ------------------------------------------------------------
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

S3_ENDPOINT_URL = env('S3_ENDPOINT_URL', default='')
S3_BUCKET = env('S3_BUCKET', default='') if S3_ENDPOINT_URL else ''
S3_REGION = env('S3_REGION', default='auto')
if not S3_ENDPOINT_URL and S3_REGION == 'auto':
    S3_REGION = 'us-east-1'
LESSON_ASSETS_ON_S3 = env.bool('LESSON_ASSETS_ON_S3', default=False)
if LESSON_ASSETS_ON_S3 and not S3_BUCKET:
    from django.core.exceptions import ImproperlyConfigured
    raise ImproperlyConfigured('LESSON_ASSETS_ON_S3 requires S3_BUCKET.')
if S3_BUCKET:
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3.S3Storage',
            'OPTIONS': {
                'bucket_name': S3_BUCKET,
                'endpoint_url': S3_ENDPOINT_URL or None,
                'access_key': env('S3_ACCESS_KEY_ID', default='') or None,
                'secret_key': env('S3_SECRET_ACCESS_KEY', default='') or None,
                'region_name': S3_REGION,
                'addressing_style': 'path',
                'signature_version': 's3v4',
                'default_acl': None,
                'file_overwrite': False,
                'querystring_auth': True,      # bucket private -> link tải có chữ ký, hết hạn sau 1 giờ
                'querystring_expire': 3600,
            },
        },
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
    }
    # Stable asset keys; document uploads retain their existing no-overwrite policy.
    STORAGES['lesson_assets'] = {
        'BACKEND': 'storages.backends.s3.S3Storage',
        'OPTIONS': {**STORAGES['default']['OPTIONS'], 'file_overwrite': True},
    }

# Service AI (thư mục ai/ — FastAPI + LangGraph). Mọi lần gọi LLM đi qua service này.
AI_SERVICE_URL = env('AI_SERVICE_URL', default='http://ai:8100')
AI_SERVICE_TOKEN = env('AI_SERVICE_TOKEN', default='')

# Embedding cho kho tri thức (Gemini, 768 chiều)
GEMINI_API_KEY = env('GEMINI_API_KEY', default='')
GEMINI_EMBED_MODEL = env('GEMINI_EMBED_MODEL', default='gemini-embedding-001')

# Algo-server (trong mạng docker compose tên service là algo-server)
ALGO_SERVER_URL = env('ALGO_SERVER_URL', default='http://algo-server:8080/api')

LIVEKIT_WS_URL = env('LIVEKIT_WS_URL', default='ws://localhost:7880')
LIVEKIT_API_URL = env('LIVEKIT_API_URL', default='http://localhost:7880')
LIVEKIT_API_KEY = env('LIVEKIT_API_KEY', default='devkey')
LIVEKIT_API_SECRET = env('LIVEKIT_API_SECRET', default='secret')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

AUTH_USER_MODEL = 'users.User'

# Email tài khoản được đăng nhập bằng chữ "admin" (để trống = superuser tạo sớm nhất)
ADMIN_LOGIN_EMAIL = env('ADMIN_LOGIN_EMAIL', default='')

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': None,
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),  # FE tự refresh khi hết hạn
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'UPDATE_LAST_LOGIN': True,
}

# Swagger / OpenAPI settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'SYNAPSE-LAB (ai4life) API',
    'DESCRIPTION': 'Core Backend API for user management, tasks, and CRUD operations.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# CORS settings
CORS_ALLOW_ALL_ORIGINS = env('CORS_ALLOW_ALL_ORIGINS')
CORS_ALLOW_CREDENTIALS = True
