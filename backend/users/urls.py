from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .Views.api_views import (
    LoginAPIView, RegisterAPIView, MeAPIView,
    PersonViewSet, UserViewSet, SubjectViewSet,
    DigitalDictionaryViewSet, TestResultViewSet
)

# Router para los ViewSets
router = DefaultRouter()
router.register(r'persons', PersonViewSet, basename='person')
router.register(r'users', UserViewSet, basename='user')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'dictionary', DigitalDictionaryViewSet, basename='dictionary')
router.register(r'results', TestResultViewSet, basename='result')

urlpatterns = [
    # Rutas de autenticacion
    path('auth/login/', LoginAPIView.as_view(), name='login'),
    path('auth/register/', RegisterAPIView.as_view(), name='register'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', MeAPIView.as_view(), name='me'),
    
    # Rutas de los ViewSets
    path('', include(router.urls)),
]
