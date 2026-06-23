from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from ..Controllers.ControllerSENA import (
    AuthController, PersonController, UserController,
    SubjectController, DictionaryController, TestResultController,
    _build_user_response,
)
from ..serializers import (
    LoginSerializer, RegisterSerializer, PersonSerializer,
    DigitalDictionarySerializer, TestResultSerializer, UserSerializer,
)
from ..permissions import IsSuperAdmin, IsAdminOrSuperAdmin


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data, error = AuthController.login(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )
        if error:
            return Response({'error': error}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(data)


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data, error = AuthController.register(serializer.validated_data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data, status=status.HTTP_201_CREATED)


class MeAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(AuthController.get_me(request.user))


class PersonViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return Response(PersonController.list_all())

    def retrieve(self, request, pk=None):
        person, error = PersonController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(PersonSerializer(person).data)

    def create(self, request):
        person, error = PersonController.create(request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PersonSerializer(person).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        person, error = PersonController.update(pk, request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(PersonSerializer(person).data)

    def destroy(self, request, pk=None):
        ok, error = PersonController.delete(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]


    def partial_update(self, request, pk=None):
        """
        Actualiza parcialmente los datos del usuario (nombre, email, teléfono, etc.)
        Se asume que los datos se envían en request.data con los campos:
        - name (opcional) → se divide en first_name y last_name
        - email (opcional)
        - phone_num (opcional)
        """
        # Obtener el usuario y su persona asociada
        user, error = UserController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)

        person = user.person  # Asumiendo que la relación existe

        # Preparar datos para actualizar la persona
        person_data = {}
        if 'name' in request.data:
            # Divide el nombre completo en first_name y last_name (puedes ajustar la lógica)
            full_name = request.data['name'].strip()
            parts = full_name.split(' ', 1)
            person_data['first_name'] = parts[0]
            person_data['last_name'] = parts[1] if len(parts) > 1 else ''
        if 'email' in request.data:
            person_data['email'] = request.data['email']
        if 'phone_num' in request.data:
            person_data['phone_num'] = request.data['phone_num']

        # Llamar al controlador de Persona para actualizar
        updated_person, error = PersonController.update(person.person_id, person_data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        # Devolver los datos actualizados del usuario (puedes usar el mismo builder que en retrieve)
        return Response(_build_user_response(user, updated_person))
    
    
    def list(self, request):
        return Response(UserController.list_all(
            role_filter=request.query_params.get('role')
        ))

    def retrieve(self, request, pk=None):
        user, error = UserController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(_build_user_response(user, user.person))

    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        new_status, error = UserController.toggle_status(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response({'status': new_status})

    @action(detail=True, methods=['patch'])
    def change_role(self, request, pk=None):
        user_obj = request.user
        if not user_obj or getattr(user_obj, 'role_id', None) != 'SUPERADMIN':
            return Response(
                {'error': 'Solo el SuperAdmin puede cambiar roles'},
                status=status.HTTP_403_FORBIDDEN
            )
        new_role = request.data.get('role')
        if not new_role:
            return Response({'error': 'Role not provided'}, status=status.HTTP_400_BAD_REQUEST)
        role, error = UserController.change_role(pk, new_role)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response({'role': role})

    def destroy(self, request, pk=None):
        target_user, error = UserController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        if target_user.role_id == 'SUPERADMIN':
            return Response(
                {'error': 'No se puede eliminar al SuperAdmin'},
                status=status.HTTP_403_FORBIDDEN
            )
        ok, error = UserController.delete(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubjectViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return Response(SubjectController.list_all())

    def retrieve(self, request, pk=None):
        subject, error = SubjectController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': subject.subject_id, 'description': subject.description})

    def create(self, request):
        data, error = SubjectController.create(request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        ok, error = SubjectController.delete(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class DigitalDictionaryViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return Response(DictionaryController.list_all(
            subject_id=request.query_params.get('subject')
        ))

    def retrieve(self, request, pk=None):
        doc, error = DictionaryController.get_by_id(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(DigitalDictionarySerializer(doc).data)

    def create(self, request):
        doc, error = DictionaryController.create(request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(DigitalDictionarySerializer(doc).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        ok, error = DictionaryController.delete(pk)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TestResultViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return Response(TestResultController.list_all(
            user_id=request.query_params.get('user_id')
        ))

    def create(self, request):
        result, error = TestResultController.create(request.data)
        if error:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TestResultSerializer(result).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def add_feedback(self, request, pk=None):
        feedback = request.data.get('feedback')
        if not feedback:
            return Response({'error': 'Feedback not provided'}, status=status.HTTP_400_BAD_REQUEST)
        result, error = TestResultController.add_feedback(pk, feedback)
        if error:
            return Response({'error': error}, status=status.HTTP_404_NOT_FOUND)
        return Response({'feedback': result.feedback})
