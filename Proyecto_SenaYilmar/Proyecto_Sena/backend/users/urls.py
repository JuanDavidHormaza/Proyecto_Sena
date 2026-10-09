# 
# verificación de correo en el REGISTRO (/auth/register-send-otp/ y /auth/register-verify-otp/)
# =======================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .Views.api_views import (
    LoginAPIView, RegisterAPIView, MeAPIView,
    VerifyOTPAPIView, ResendOTPAPIView, ResetPasswordAPIView, CustomTokenRefreshView,
    RegisterSendOTPAPIView, RegisterVerifyOTPAPIView,
    CheckDocumentAPIView, CheckEmailAPIView,
    PrivilegedLoginAPIView, PrivilegedMeAPIView,
    UserViewSet, SubjectViewSet,
    DigitalDictionaryViewSet, TestResultViewSet, RankingViewSet,
    FichaRequestViewSet,
)
from .Views.media_views import MediaProxyAPIView, MediaUploadAPIView
from .Views.exam_views import (
    SpeakingSubmissionAPIView, ExamTTSAPIView,
    ExamStartAPIView, ExamAdaptiveBankAPIView, ExamEvaluateStepAPIView,
    ExamEvaluateSpeakingAPIView
)


router = DefaultRouter()

router.register(r'users',          UserViewSet,              basename='user')
router.register(r'subjects',       SubjectViewSet,           basename='subject')
router.register(r'dictionary',     DigitalDictionaryViewSet, basename='dictionary')
router.register(r'results',        TestResultViewSet,        basename='result')
router.register(r'ranking',        RankingViewSet,           basename='ranking')
router.register(r'ficha-requests', FichaRequestViewSet,      basename='ficha-request')

urlpatterns = [
    # ── Autenticación (login) con MFA ──────────────────────────────────
    path('auth/login/',          LoginAPIView.as_view(),         name='login-slash'),
    path('auth/login',           LoginAPIView.as_view(),         name='login'),
    path('auth/verify-otp/',     VerifyOTPAPIView.as_view(),     name='verify-otp-slash'),
    path('auth/verify-otp',      VerifyOTPAPIView.as_view(),     name='verify-otp'),
    path('auth/resend-otp/',     ResendOTPAPIView.as_view(),     name='resend-otp-slash'),
    path('auth/resend-otp',      ResendOTPAPIView.as_view(),     name='resend-otp'),
    path('auth/reset-password/', ResetPasswordAPIView.as_view(), name='reset-password-slash'),
    path('auth/reset-password',  ResetPasswordAPIView.as_view(), name='reset-password'),

    # ── Registro con verificación de correo ────────────────────────────
    # Paso 1: valida datos + dominio y envía OTP al correo (NO crea cuenta aún)
    path('auth/register-send-otp/',   RegisterSendOTPAPIView.as_view(),   name='register-send-otp-slash'),
    path('auth/register-send-otp',    RegisterSendOTPAPIView.as_view(),   name='register-send-otp'),
    # Paso 2: verifica OTP y crea la cuenta definitivamente
    path('auth/register-verify-otp/', RegisterVerifyOTPAPIView.as_view(), name='register-verify-otp-slash'),
    path('auth/register-verify-otp',  RegisterVerifyOTPAPIView.as_view(), name='register-verify-otp'),
    # Ruta original (se mantiene por compatibilidad)
    path('auth/register/', RegisterAPIView.as_view(), name='register-slash'),
    path('auth/register',  RegisterAPIView.as_view(), name='register'),

    # ── Validación de Documento y Registro Alterno ───────────────────────
    path('auth/check-document/', CheckDocumentAPIView.as_view(), name='check-document-slash'),
    path('auth/check-document',  CheckDocumentAPIView.as_view(), name='check-document'),
    path('auth/check-email/',    CheckEmailAPIView.as_view(),    name='check-email-slash'),
    path('auth/check-email',     CheckEmailAPIView.as_view(),    name='check-email'),

    # ── Refresh / Me ───────────────────────────────────────────────────
    path('auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh_slash'),
    path('auth/refresh',  CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/',      MeAPIView.as_view(),              name='me_slash'),
    path('auth/me',       MeAPIView.as_view(),              name='me'),

    # Acceso sin JWT para roles privilegiados
    path('auth/privileged-login/', PrivilegedLoginAPIView.as_view(), name='privileged_login'),
    path('auth/privileged-me/',     PrivilegedMeAPIView.as_view(),     name='privileged_me'),

    # ── Proxy y Streaming de Media (MinIO Interno en Docker) ───────────
    path('media/<str:bucket_name>/<path:file_key>/', MediaProxyAPIView.as_view(), name='media-proxy-slash'),
    path('media/<str:bucket_name>/<path:file_key>',  MediaProxyAPIView.as_view(), name='media-proxy'),
    path('media/upload/',                            MediaUploadAPIView.as_view(), name='media-upload'),

    # ── Examen Adaptativo Continuo CEFR (Alimentado por Diccionario ADSO)
    path('exam/start/',                             ExamStartAPIView.as_view(),          name='exam-start'),
    path('exam/adaptive-bank/',                     ExamAdaptiveBankAPIView.as_view(),   name='exam-adaptive-bank'),
    path('exam/evaluate-step/',                     ExamEvaluateStepAPIView.as_view(),   name='exam-evaluate-step'),
    path('exam/evaluate-speaking/',                 ExamEvaluateSpeakingAPIView.as_view(), name='exam-evaluate-speaking'),
    path('exam/speaking/',                          SpeakingSubmissionAPIView.as_view(), name='exam-speaking'),
    path('exam/tts/',                               ExamTTSAPIView.as_view(),            name='exam-tts'),

    # ── ViewSets ───────────────────────────────────────────────────────
    path('', include(router.urls)),
]