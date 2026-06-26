# 
# verificación de correo en el REGISTRO (/auth/register-send-otp/ y /auth/register-verify-otp/)
# =======================================================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .Views.api_views import (
    LoginAPIView, RegisterAPIView, MeAPIView,
    VerifyOTPAPIView, ResendOTPAPIView,
    RegisterSendOTPAPIView, RegisterVerifyOTPAPIView,
    PrivilegedLoginAPIView, PrivilegedMeAPIView,
    UserViewSet, SubjectViewSet,
    DigitalDictionaryViewSet, TestResultViewSet, RankingViewSet,
)


router = DefaultRouter()

router.register(r'users',      UserViewSet,              basename='user')
router.register(r'subjects',   SubjectViewSet,           basename='subject')
router.register(r'dictionary', DigitalDictionaryViewSet, basename='dictionary')
router.register(r'results',    TestResultViewSet,        basename='result')
router.register(r'ranking',    RankingViewSet,           basename='ranking')

urlpatterns = [
    # ── Autenticación (login) con MFA ──────────────────────────────────
    path('auth/login/',       LoginAPIView.as_view(),      name='login'),
    path('auth/verify-otp/',  VerifyOTPAPIView.as_view(),  name='verify-otp'),
    path('auth/resend-otp/',  ResendOTPAPIView.as_view(),  name='resend-otp'),

    # ── Registro con verificación de correo ────────────────────────────
    # Paso 1: valida datos + dominio y envía OTP al correo (NO crea cuenta aún)
    path('auth/register-send-otp/',   RegisterSendOTPAPIView.as_view(),   name='register-send-otp'),
    # Paso 2: verifica OTP y crea la cuenta definitivamente
    path('auth/register-verify-otp/', RegisterVerifyOTPAPIView.as_view(), name='register-verify-otp'),
    # Ruta original (se mantiene por compatibilidad pero ya no la usa el frontend nuevo)
    path('auth/register/', RegisterAPIView.as_view(), name='register'),

    # ── Refresh / Me ───────────────────────────────────────────────────
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/',      MeAPIView.as_view(),        name='me'),

    # Acceso sin JWT para roles privilegiados
    path('auth/privileged-login/', PrivilegedLoginAPIView.as_view(), name='privileged_login'),
    path('auth/privileged-me/',     PrivilegedMeAPIView.as_view(),     name='privileged_me'),


    # ── ViewSets ───────────────────────────────────────────────────────
    path('', include(router.urls)),
]