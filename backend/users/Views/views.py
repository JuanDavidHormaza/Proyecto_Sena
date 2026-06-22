from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ..Models.models import CustomUser



@api_view(['GET'])
def test_api(request):
    return Response({"message": "Backend funcionando correctamente"})
# Create your views here.

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil(request):
    return Response({
        "user": request.user.username
    })
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def perfil(request):
    return Response({
        "user": request.user.username,
        "role": request.user.role
    })

@api_view(['POST'])
def register(request):
    username = request.data.get('username')
    password = request.data.get('password')
    role = request.data.get('role')

    if not username or not password or not role:
        return Response({'error': 'Faltan datos'}, status=400)

    if CustomUser.objects.filter(username=username).exists():
        return Response({'error': 'Usuario ya existe'}, status=400)

    user = CustomUser.objects.create_user(
        username=username,
        password=password,
        role=role
    )

    return Response({'message': 'Usuario creado correctamente'})