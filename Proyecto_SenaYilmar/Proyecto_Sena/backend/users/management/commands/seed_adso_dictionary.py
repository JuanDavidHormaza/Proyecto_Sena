# backend/users/management/commands/seed_adso_dictionary.py
from django.core.management.base import BaseCommand
from users.Models.modelsSENA import Subject, DigitalDictionary


class Command(BaseCommand):
    help = 'Puebla el Diccionario Digital con términos técnicos ADSO de A1 a B2 para alimentar el examen adaptativo'

    def handle(self, *args, **options):
        # 1. Asegurar la asignatura ADSO
        subject, _ = Subject.objects.get_or_create(
            subject_id='ADSO',
            defaults={'description': 'Análisis y Desarrollo de Software (SENA)'}
        )
        self.stdout.write(self.style.SUCCESS(f'Asignatura lista: {subject.subject_id} - {subject.description}'))

        # 2. Definición del banco de vocabulario ADSO estructurado
        TERMS = [
            # ── A1 (Fundamentos) ──────────────────────────────────────────
            {
                'word_id': 'Variable',
                'level': 'A1',
                'competence': 'Grammar',
                'definition': 'A named storage location in memory containing data that can be modified during program execution.',
                'synonyms': 'identifier, container, data holder',
                'audio': 'variable.mp3',
                'image': 'variable.png',
            },
            {
                'word_id': 'Button',
                'level': 'A1',
                'competence': 'Reading',
                'definition': 'A graphical user interface element clicked by a user to trigger a specific action or event in the system.',
                'synonyms': 'UI control, clickable element, trigger',
                'audio': 'button.mp3',
                'image': 'button.png',
            },
            {
                'word_id': 'Code',
                'level': 'A1',
                'competence': 'Grammar',
                'definition': 'Instructions written in a structured programming language for a computer to execute.',
                'synonyms': 'source code, script, program instructions',
                'audio': 'code.mp3',
                'image': 'code.png',
            },
            {
                'word_id': 'Input',
                'level': 'A1',
                'competence': 'Speaking',
                'definition': 'Data or signals provided to a computer program for processing by an external user or device.',
                'synonyms': 'entry data, user input, parameter',
                'audio': 'input.mp3',
                'image': 'input.png',
            },
            {
                'word_id': 'Output',
                'level': 'A1',
                'competence': 'Speaking',
                'definition': 'Information produced and delivered by a software program after processing input data.',
                'synonyms': 'result, displayed data, return value',
                'audio': 'output.mp3',
                'image': 'output.png',
            },
            {
                'word_id': 'File',
                'level': 'A1',
                'competence': 'Reading',
                'definition': 'A digital resource recorded on a storage device that contains structured text, code, or media data.',
                'synonyms': 'document, record, digital resource',
                'audio': 'file.mp3',
                'image': 'file.png',
            },
            {
                'word_id': 'Integer',
                'level': 'A1',
                'competence': 'Grammar',
                'definition': 'A primitive numeric data type representing whole numbers without fractional components.',
                'synonyms': 'whole number, int, digit',
                'audio': 'integer.mp3',
                'image': 'integer.png',
            },
            {
                'word_id': 'String',
                'level': 'A1',
                'competence': 'Reading',
                'definition': 'An immutable sequence of characters used in programming to represent textual information.',
                'synonyms': 'text sequence, literal, string literal',
                'audio': 'string.mp3',
                'image': 'string.png',
            },

            # ── A2 (Intermedio Básico & Lógica) ───────────────────────────
            {
                'word_id': 'Function',
                'level': 'A2',
                'competence': 'Grammar',
                'definition': 'A reusable block of organized code designed to perform a single specific computation and optionally return a value.',
                'synonyms': 'method, procedure, routine',
                'audio': 'function.mp3',
                'image': 'function.png',
            },
            {
                'word_id': 'Database',
                'level': 'A2',
                'competence': 'Reading',
                'definition': 'An organized collection of electronic data stored and accessed digitally through a database management system.',
                'synonyms': 'data store, DB, relational storage',
                'audio': 'database.mp3',
                'image': 'database.png',
            },
            {
                'word_id': 'Array',
                'level': 'A2',
                'competence': 'Grammar',
                'definition': 'An ordered data structure that stores a collection of elements accessible by numerical indices.',
                'synonyms': 'list, vector, ordered collection',
                'audio': 'array.mp3',
                'image': 'array.png',
            },
            {
                'word_id': 'Loop',
                'level': 'A2',
                'competence': 'Speaking',
                'definition': 'A programming control flow structure that repeats a block of instructions continuously until a termination condition is met.',
                'synonyms': 'iteration, cycle, repetition',
                'audio': 'loop.mp3',
                'image': 'loop.png',
            },
            {
                'word_id': 'Frontend',
                'level': 'A2',
                'competence': 'Reading',
                'definition': 'The client-side presentation layer of a software system with which end-users interact directly.',
                'synonyms': 'client-side, user interface, UI',
                'audio': 'frontend.mp3',
                'image': 'frontend.png',
            },
            {
                'word_id': 'Backend',
                'level': 'A2',
                'competence': 'Writing',
                'definition': 'The server-side component of an application responsible for data persistence, authentication, and core business logic.',
                'synonyms': 'server-side, API layer, core architecture',
                'audio': 'backend.mp3',
                'image': 'backend.png',
            },
            {
                'word_id': 'Boolean',
                'level': 'A2',
                'competence': 'Grammar',
                'definition': 'A logical data type that expresses binary truth values: either true or false.',
                'synonyms': 'logical flag, binary condition, truth value',
                'audio': 'boolean.mp3',
                'image': 'boolean.png',
            },
            {
                'word_id': 'Condition',
                'level': 'A2',
                'competence': 'Reading',
                'definition': 'A logical statement evaluated by an if-statement or switch structure to decide program branching.',
                'synonyms': 'predicate, logic branch, decision rule',
                'audio': 'condition.mp3',
                'image': 'condition.png',
            },

            # ── B1 (Intermedio Técnico ADSO) ──────────────────────────────
            {
                'word_id': 'Framework',
                'level': 'B1',
                'competence': 'Reading',
                'definition': 'A foundational software architecture providing standardized libraries and patterns to accelerate application development.',
                'synonyms': 'development platform, software scaffold, architecture suite',
                'audio': 'framework.mp3',
                'image': 'framework.png',
            },
            {
                'word_id': 'Algorithm',
                'level': 'B1',
                'competence': 'Grammar',
                'definition': 'A finite, unambiguous sequence of computational instructions designed to solve a problem or calculate an outcome.',
                'synonyms': 'procedure, logical sequence, computational recipe',
                'audio': 'algorithm.mp3',
                'image': 'algorithm.png',
            },
            {
                'word_id': 'Authentication',
                'level': 'B1',
                'competence': 'Writing',
                'definition': 'The security mechanism that validates the identity of a client or user before granting access to protected resources.',
                'synonyms': 'identity verification, login validation, credential check',
                'audio': 'authentication.mp3',
                'image': 'authentication.png',
            },
            {
                'word_id': 'Endpoint',
                'level': 'B1',
                'competence': 'Speaking',
                'definition': 'A dedicated URL address exposed by a web service or API where client HTTP requests are received and handled.',
                'synonyms': 'API route, service URI, web hook',
                'audio': 'endpoint.mp3',
                'image': 'endpoint.png',
            },
            {
                'word_id': 'Refactoring',
                'level': 'B1',
                'competence': 'Writing',
                'definition': 'The disciplined engineering practice of improving software internal structure and readability without altering external behavior.',
                'synonyms': 'code modernization, architectural cleanup, optimization',
                'audio': 'refactoring.mp3',
                'image': 'refactoring.png',
            },
            {
                'word_id': 'Repository',
                'level': 'B1',
                'competence': 'Grammar',
                'definition': 'A centralized version-controlled directory where software source files, branches, and historical commits are tracked.',
                'synonyms': 'codebase store, version control repo, Git archive',
                'audio': 'repository.mp3',
                'image': 'repository.png',
            },
            {
                'word_id': 'Middleware',
                'level': 'B1',
                'competence': 'Reading',
                'definition': 'A software layer that intercepts incoming HTTP requests to perform authentication, logging, or header processing.',
                'synonyms': 'interceptor, request filter, pipeline handler',
                'audio': 'middleware.mp3',
                'image': 'middleware.png',
            },
            {
                'word_id': 'Debugging',
                'level': 'B1',
                'competence': 'Speaking',
                'definition': 'The analytical process of finding, diagnosing, and resolving bugs or performance bottlenecks in computer programs.',
                'synonyms': 'troubleshooting, error isolation, code auditing',
                'audio': 'debugging.mp3',
                'image': 'debugging.png',
            },

            # ── B2 (Avanzado & Arquitectura) ──────────────────────────────
            {
                'word_id': 'Microservices',
                'level': 'B2',
                'competence': 'Reading',
                'definition': 'A distributed architectural style where an enterprise application is partitioned into independently deployable small services.',
                'synonyms': 'distributed services, decoupled architecture, modular backend',
                'audio': 'microservices.mp3',
                'image': 'microservices.png',
            },
            {
                'word_id': 'Continuous Integration',
                'level': 'B2',
                'competence': 'Writing',
                'definition': 'A modern DevOps engineering practice where team developers regularly merge code commits into a central branch with automated tests.',
                'synonyms': 'CI/CD pipeline, automated build, trunk integration',
                'audio': 'continuous_integration.mp3',
                'image': 'continuous_integration.png',
            },
            {
                'word_id': 'Scalability',
                'level': 'B2',
                'competence': 'Speaking',
                'definition': 'The architectural capability of a system to sustain increased concurrent workloads by scaling hardware or software nodes.',
                'synonyms': 'elastic capacity, load tolerance, horizontal scaling',
                'audio': 'scalability.mp3',
                'image': 'scalability.png',
            },
            {
                'word_id': 'Polymorphism',
                'level': 'B2',
                'competence': 'Grammar',
                'definition': 'An object-oriented principle that allows distinct classes to respond to identical method signatures with specialized implementations.',
                'synonyms': 'dynamic dispatch, interface contract, method override',
                'audio': 'polymorphism.mp3',
                'image': 'polymorphism.png',
            },
            {
                'word_id': 'Vulnerability',
                'level': 'B2',
                'competence': 'Writing',
                'definition': 'A flaw in software code or configuration that can be leveraged by a malicious actor to breach system confidentiality or integrity.',
                'synonyms': 'security loophole, exploit surface, attack vector',
                'audio': 'vulnerability.mp3',
                'image': 'vulnerability.png',
            },
            {
                'word_id': 'Asynchronous',
                'level': 'B2',
                'competence': 'Speaking',
                'definition': 'A non-blocking concurrency paradigm allowing long-running operations to execute without freezing the primary program thread.',
                'synonyms': 'non-blocking execution, event-driven, concurrent worker',
                'audio': 'asynchronous.mp3',
                'image': 'asynchronous.png',
            },
            {
                'word_id': 'Deployment',
                'level': 'B2',
                'competence': 'Writing',
                'definition': 'The release workflow of packaging, configuring, and publishing tested software artifacts to a target production cloud server.',
                'synonyms': 'production release, system provisioning, software delivery',
                'audio': 'deployment.mp3',
                'image': 'deployment.png',
            },
            {
                'word_id': 'Encryption',
                'level': 'B2',
                'competence': 'Reading',
                'definition': 'The cryptographic transformation of plain text into cipher text using mathematical keys to safeguard data at rest and in transit.',
                'synonyms': 'cryptographic cipher, data protection, secure hashing',
                'audio': 'encryption.mp3',
                'image': 'encryption.png',
            },
        ]

        created_count = 0
        updated_count = 0

        for item in TERMS:
            obj, created = DigitalDictionary.objects.update_or_create(
                word_id=item['word_id'],
                subject=subject,
                defaults={
                    'level': item['level'],
                    'competence': item['competence'],
                    'definition': item['definition'],
                    'synonyms': item['synonyms'],
                    'audio': item['audio'],
                    'image': item['image'],
                    'video': '',
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Diccionario ADSO poblado exitosamente: {created_count} creados, {updated_count} actualizados. '
            f'Total términos en BD: {DigitalDictionary.objects.count()}'
        ))
