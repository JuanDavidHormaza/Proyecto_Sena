# backend/users/management/commands/seed_all_dictionaries.py
"""
Comando de ingesta masiva y sincronización completa para los 3 Diccionarios Técnicos del SENA:
1. Análisis y Desarrollo de Software (ADSO) - Ficha 2670142
2. Mecánica Industrial - Ficha 3520681
3. Producción Multimedia - Ficha 2554901

Garantiza la persistencia idempotente (update_or_create) sin duplicados,
con asignación canónica de nivel CEFR (A1-B2), competencia pedagógica,
traducción técnica al español y metadatos multimedia.
"""
import re
import os
import logging
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from users.Models.modelsSENA import Subject, DigitalDictionary, Person, User, FichaRequest, TestResult
from users.services.storage_service import StorageService

logger = logging.getLogger(__name__)


def slugify(text: str) -> str:
    s = text.strip().lower()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[-\s]+', '_', s)
    return s.strip('_')


# ============================================================================
# 1. CATÁLOGO COMPLETO: ANÁLISIS Y DESARROLLO DE SOFTWARE (ADSO)
# ============================================================================
ADSO_TERMS = [
    # ── A1 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Variable',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'A named storage location in memory containing data that can be modified during program execution.',
        'synonyms': 'identifier, container, data holder',
        'spanish_translation': 'Variable',
        'audio': 'variable.mp3',
        'image': 'variable.png',
    },
    {
        'word_id': 'Button',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'A graphical user interface element clicked by a user to trigger a specific action or event in the system.',
        'synonyms': 'UI control, clickable element, trigger',
        'spanish_translation': 'Botón',
        'audio': 'button.mp3',
        'image': 'button.png',
    },
    {
        'word_id': 'Code',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'Instructions written in a structured programming language for a computer to execute.',
        'synonyms': 'source code, script, program instructions',
        'spanish_translation': 'Código',
        'audio': 'code.mp3',
        'image': 'code.png',
    },
    {
        'word_id': 'Input',
        'level': 'A1',
        'competence': 'Speaking',
        'definition': 'Data or signals provided to a computer program for processing by an external user or device.',
        'synonyms': 'entry data, user input, parameter',
        'spanish_translation': 'Entrada de datos',
        'audio': 'input.mp3',
        'image': 'input.png',
    },
    {
        'word_id': 'Output',
        'level': 'A1',
        'competence': 'Speaking',
        'definition': 'Information produced and delivered by a software program after processing input data.',
        'synonyms': 'result, displayed data, return value',
        'spanish_translation': 'Salida de datos',
        'audio': 'output.mp3',
        'image': 'output.png',
    },
    {
        'word_id': 'File',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'A digital resource recorded on a storage device that contains structured text, code, or media data.',
        'synonyms': 'document, record, digital resource',
        'spanish_translation': 'Archivo',
        'audio': 'file.mp3',
        'image': 'file.png',
    },
    {
        'word_id': 'Integer',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'A primitive numeric data type representing whole numbers without fractional components.',
        'synonyms': 'whole number, int, digit',
        'spanish_translation': 'Entero',
        'audio': 'integer.mp3',
        'image': 'integer.png',
    },
    {
        'word_id': 'String',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'An immutable sequence of characters used in programming to represent textual information.',
        'synonyms': 'text sequence, literal, string literal',
        'spanish_translation': 'Cadena de texto',
        'audio': 'string.mp3',
        'image': 'string.png',
    },
    {
        'word_id': 'Function',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'A reusable block of organized code designed to perform a single specific computation and optionally return a value.',
        'synonyms': 'method, procedure, routine',
        'spanish_translation': 'Función',
        'audio': 'function.mp3',
        'image': 'function.png',
    },
    {
        'word_id': 'Database',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'An organized collection of electronic data stored and accessed digitally through a database management system.',
        'synonyms': 'data store, DB, relational storage',
        'spanish_translation': 'Base de datos',
        'audio': 'database.mp3',
        'image': 'database.png',
    },
    {
        'word_id': 'Array',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'An ordered data structure that stores a collection of elements accessible by numerical indices.',
        'synonyms': 'list, vector, ordered collection',
        'spanish_translation': 'Arreglo / Vector',
        'audio': 'array.mp3',
        'image': 'array.png',
    },
    {
        'word_id': 'Loop',
        'level': 'A1',
        'competence': 'Speaking',
        'definition': 'A programming control flow structure that repeats a block of instructions continuously until a termination condition is met.',
        'synonyms': 'iteration, cycle, repetition',
        'spanish_translation': 'Bucle / Ciclo',
        'audio': 'loop.mp3',
        'image': 'loop.png',
    },
    {
        'word_id': 'Frontend',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'The client-side presentation layer of a software system with which end-users interact directly.',
        'synonyms': 'client-side, user interface, UI',
        'spanish_translation': 'Interfaz de usuario / Frontend',
        'audio': 'frontend.mp3',
        'image': 'frontend.png',
    },
    {
        'word_id': 'Backend',
        'level': 'A1',
        'competence': 'Writing',
        'definition': 'The server-side component of an application responsible for data persistence, authentication, and core business logic.',
        'synonyms': 'server-side, API layer, core architecture',
        'spanish_translation': 'Servidor / Backend',
        'audio': 'backend.mp3',
        'image': 'backend.png',
    },
    {
        'word_id': 'Boolean',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'A logical data type that expresses binary truth values: either true or false.',
        'synonyms': 'logical flag, binary condition, truth value',
        'spanish_translation': 'Booleano',
        'audio': 'boolean.mp3',
        'image': 'boolean.png',
    },
    {
        'word_id': 'Condition',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'A logical statement evaluated by an if-statement or switch structure to decide program branching.',
        'synonyms': 'predicate, logic branch, decision rule',
        'spanish_translation': 'Condición',
        'audio': 'condition.mp3',
        'image': 'condition.png',
    },

    # ── A2 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Framework',
        'level': 'A2',
        'competence': 'Reading',
        'definition': 'A foundational software architecture providing standardized libraries and patterns to accelerate application development.',
        'synonyms': 'development platform, software scaffold, architecture suite',
        'spanish_translation': 'Marco de trabajo / Framework',
        'audio': 'framework.mp3',
        'image': 'framework.png',
    },
    {
        'word_id': 'Server',
        'level': 'A2',
        'competence': 'Writing',
        'definition': 'A physical or cloud computer system providing shared resources, databases, and network services to clients.',
        'synonyms': 'host machine, cloud instance, service daemon',
        'spanish_translation': 'Servidor',
        'audio': 'server.mp3',
        'image': 'server.png',
    },
    {
        'word_id': 'Request',
        'level': 'A2',
        'competence': 'Speaking',
        'definition': 'A formatted message transmitted from a client application to an HTTP server asking for a resource or action.',
        'synonyms': 'HTTP call, client query, web invocation',
        'spanish_translation': 'Petición HTTP',
        'audio': 'request.mp3',
        'image': 'request.png',
    },
    {
        'word_id': 'Response',
        'level': 'A2',
        'competence': 'Speaking',
        'definition': 'The structured status code and payload delivered by a server back to a client upon processing an incoming request.',
        'synonyms': 'server reply, payload answer, HTTP return',
        'spanish_translation': 'Respuesta HTTP',
        'audio': 'response.mp3',
        'image': 'response.png',
    },
    {
        'word_id': 'Bug',
        'level': 'A2',
        'competence': 'Writing',
        'definition': 'An unintended error, defect, or flaw in software source code that produces an incorrect or unexpected result.',
        'synonyms': 'defect, software flaw, logic glitch',
        'spanish_translation': 'Error de código / Bug',
        'audio': 'bug.mp3',
        'image': 'bug.png',
    },
    {
        'word_id': 'Component',
        'level': 'A2',
        'competence': 'Reading',
        'definition': 'An isolated and reusable user interface element encapsulated with its own state, presentation, and logic.',
        'synonyms': 'widget, UI block, modular unit',
        'spanish_translation': 'Componente UI',
        'audio': 'component.mp3',
        'image': 'component.png',
    },
    {
        'word_id': 'API',
        'level': 'A2',
        'competence': 'Speaking',
        'definition': 'An Application Programming Interface specifying communication contracts between decoupled software components.',
        'synonyms': 'service interface, integration endpoint, web contract',
        'spanish_translation': 'Interfaz de Programación de Aplicaciones (API)',
        'audio': 'api.mp3',
        'image': 'api.png',
    },
    {
        'word_id': 'Query',
        'level': 'A2',
        'competence': 'Grammar',
        'definition': 'A structured inquiry command executed against a database engine to select, insert, update, or filter records.',
        'synonyms': 'SQL command, database search, data lookup',
        'spanish_translation': 'Consulta de base de datos',
        'audio': 'query.mp3',
        'image': 'query.png',
    },
    {
        'word_id': 'Git',
        'level': 'A2',
        'competence': 'Writing',
        'definition': 'A distributed version control system designed to track file revisions and manage collaborative software development.',
        'synonyms': 'VCS, source control, version tracker',
        'spanish_translation': 'Sistema de control de versiones Git',
        'audio': 'git.mp3',
        'image': 'git.png',
    },
    {
        'word_id': 'Branch',
        'level': 'A2',
        'competence': 'Reading',
        'definition': 'An independent line of development in a version control repository isolating new features from the main branch.',
        'synonyms': 'divergent line, feature track, fork',
        'spanish_translation': 'Rama de desarrollo',
        'audio': 'branch.mp3',
        'image': 'branch.png',
    },
    {
        'word_id': 'Commit',
        'level': 'A2',
        'competence': 'Writing',
        'definition': 'A permanent recorded snapshot of staged changes saved to a Git repository history with an explanatory message.',
        'synonyms': 'revision snapshot, change record, savepoint',
        'spanish_translation': 'Confirmación de cambios / Commit',
        'audio': 'commit.mp3',
        'image': 'commit.png',
    },
    {
        'word_id': 'Parameter',
        'level': 'A2',
        'competence': 'Grammar',
        'definition': 'A named variable declared in a function signature that receives input values when the function is invoked.',
        'synonyms': 'argument signature, formal input, signature variable',
        'spanish_translation': 'Parámetro',
        'audio': 'parameter.mp3',
        'image': 'parameter.png',
    },

    # ── B1 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Algorithm',
        'level': 'B1',
        'competence': 'Reading',
        'definition': 'A finite, unambiguous sequence of computational instructions designed to solve a problem or calculate an outcome.',
        'synonyms': 'procedure, logical sequence, computational recipe',
        'spanish_translation': 'Algoritmo',
        'audio': 'algorithm.mp3',
        'image': 'algorithm.png',
    },
    {
        'word_id': 'Authentication',
        'level': 'B1',
        'competence': 'Writing',
        'definition': 'The security mechanism that validates the identity of a client or user before granting access to protected resources.',
        'synonyms': 'identity verification, login validation, credential check',
        'spanish_translation': 'Autenticación',
        'audio': 'authentication.mp3',
        'image': 'authentication.png',
    },
    {
        'word_id': 'Endpoint',
        'level': 'B1',
        'competence': 'Speaking',
        'definition': 'A dedicated URL address exposed by a web service or API where client HTTP requests are received and handled.',
        'synonyms': 'API route, service URI, web hook',
        'spanish_translation': 'Punto de conexión / Endpoint',
        'audio': 'endpoint.mp3',
        'image': 'endpoint.png',
    },
    {
        'word_id': 'Refactoring',
        'level': 'B1',
        'competence': 'Writing',
        'definition': 'The disciplined engineering practice of improving software internal structure and readability without altering external behavior.',
        'synonyms': 'code modernization, architectural cleanup, optimization',
        'spanish_translation': 'Refactorización',
        'audio': 'refactoring.mp3',
        'image': 'refactoring.png',
    },
    {
        'word_id': 'Repository',
        'level': 'B1',
        'competence': 'Grammar',
        'definition': 'A centralized version-controlled directory where software source files, branches, and historical commits are tracked.',
        'synonyms': 'codebase store, version control repo, Git archive',
        'spanish_translation': 'Repositorio',
        'audio': 'repository.mp3',
        'image': 'repository.png',
    },
    {
        'word_id': 'Middleware',
        'level': 'B1',
        'competence': 'Reading',
        'definition': 'A software layer that intercepts incoming HTTP requests to perform authentication, logging, or header processing.',
        'synonyms': 'interceptor, request filter, pipeline handler',
        'spanish_translation': 'Capa intermedia / Middleware',
        'audio': 'middleware.mp3',
        'image': 'middleware.png',
    },
    {
        'word_id': 'Debugging',
        'level': 'B1',
        'competence': 'Speaking',
        'definition': 'The analytical process of finding, diagnosing, and resolving bugs or performance bottlenecks in computer programs.',
        'synonyms': 'troubleshooting, error isolation, code auditing',
        'spanish_translation': 'Depuración de errores',
        'audio': 'debugging.mp3',
        'image': 'debugging.png',
    },
    {
        'word_id': 'Docker',
        'level': 'B1',
        'competence': 'Reading',
        'definition': 'An open containerization platform that packages software applications and all their dependencies into lightweight containers.',
        'synonyms': 'container platform, image runner, sandbox engine',
        'spanish_translation': 'Contenedor Docker',
        'audio': 'docker.mp3',
        'image': 'docker.png',
    },
    {
        'word_id': 'Token',
        'level': 'B1',
        'competence': 'Grammar',
        'definition': 'A digitally signed cryptographic string proving authenticated user claims between distributed services.',
        'synonyms': 'JWT, auth token, security bearer',
        'spanish_translation': 'Ficha de seguridad / Token JWT',
        'audio': 'token.mp3',
        'image': 'token.png',
    },
    {
        'word_id': 'Inheritance',
        'level': 'B1',
        'competence': 'Writing',
        'definition': 'An object-oriented programming paradigm allowing a child class to inherit fields and behaviors from a base parent class.',
        'synonyms': 'subclassing, derivation, hierarchy',
        'spanish_translation': 'Herencia orientada a objetos',
        'audio': 'inheritance.mp3',
        'image': 'inheritance.png',
    },

    # ── B2 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Microservices',
        'level': 'B2',
        'competence': 'Reading',
        'definition': 'A distributed architectural style where an enterprise application is partitioned into independently deployable small services.',
        'synonyms': 'distributed services, decoupled architecture, modular backend',
        'spanish_translation': 'Microservicios',
        'audio': 'microservices.mp3',
        'image': 'microservices.png',
    },
    {
        'word_id': 'Continuous Integration',
        'level': 'B2',
        'competence': 'Writing',
        'definition': 'A modern DevOps engineering practice where team developers regularly merge code commits into a central branch with automated tests.',
        'synonyms': 'CI/CD pipeline, automated build, trunk integration',
        'spanish_translation': 'Integración continua (CI/CD)',
        'audio': 'continuous_integration.mp3',
        'image': 'continuous_integration.png',
    },
    {
        'word_id': 'Scalability',
        'level': 'B2',
        'competence': 'Speaking',
        'definition': 'The architectural capability of a system to sustain increased concurrent workloads by scaling hardware or software nodes.',
        'synonyms': 'elastic capacity, load tolerance, horizontal scaling',
        'spanish_translation': 'Escalabilidad',
        'audio': 'scalability.mp3',
        'image': 'scalability.png',
    },
    {
        'word_id': 'Polymorphism',
        'level': 'B2',
        'competence': 'Grammar',
        'definition': 'An object-oriented principle that allows distinct classes to respond to identical method signatures with specialized implementations.',
        'synonyms': 'dynamic dispatch, interface contract, method override',
        'spanish_translation': 'Polimorfismo',
        'audio': 'polymorphism.mp3',
        'image': 'polymorphism.png',
    },
    {
        'word_id': 'Vulnerability',
        'level': 'B2',
        'competence': 'Writing',
        'definition': 'A flaw in software code or configuration that can be leveraged by a malicious actor to breach system confidentiality or integrity.',
        'synonyms': 'security loophole, exploit surface, attack vector',
        'spanish_translation': 'Vulnerabilidad de seguridad',
        'audio': 'vulnerability.mp3',
        'image': 'vulnerability.png',
    },
    {
        'word_id': 'Asynchronous',
        'level': 'B2',
        'competence': 'Speaking',
        'definition': 'A non-blocking concurrency paradigm allowing long-running operations to execute without freezing the primary program thread.',
        'synonyms': 'non-blocking execution, event-driven, concurrent worker',
        'spanish_translation': 'Asíncrono',
        'audio': 'asynchronous.mp3',
        'image': 'asynchronous.png',
    },
    {
        'word_id': 'Deployment',
        'level': 'B2',
        'competence': 'Writing',
        'definition': 'The release workflow of packaging, configuring, and publishing tested software artifacts to a target production cloud server.',
        'synonyms': 'production release, system provisioning, software delivery',
        'spanish_translation': 'Despliegue a producción',
        'audio': 'deployment.mp3',
        'image': 'deployment.png',
    },
    {
        'word_id': 'Encryption',
        'level': 'B2',
        'competence': 'Reading',
        'definition': 'The cryptographic transformation of plain text into cipher text using mathematical keys to safeguard data at rest and in transit.',
        'synonyms': 'cryptographic cipher, data protection, secure hashing',
        'spanish_translation': 'Cifrado / Encriptación',
        'audio': 'encryption.mp3',
        'image': 'encryption.png',
    },
]


# ============================================================================
# 2. CATÁLOGO COMPLETO: MECÁNICA INDUSTRIAL
# ============================================================================
MECANICA_TERMS = [
    # ── A1 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Torque',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'A rotational force produced by an engine mechanism that causes an object to rotate around an axis.',
        'synonyms': 'rotational force, moment of force, twisting force',
        'spanish_translation': 'Par de torsión / Torque',
        'audio': 'torque.mp3',
        'image': 'torque.png',
    },
    {
        'word_id': 'Gearbox',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'A mechanical assembly of gears used to transfer rotational power and adjust speed between an engine and wheels.',
        'synonyms': 'transmission case, gear train, reduction gear',
        'spanish_translation': 'Caja de engranajes / Transmisión',
        'audio': 'gearbox.mp3',
        'image': 'gearbox.png',
    },
    {
        'word_id': 'Caliper',
        'level': 'A1',
        'competence': 'Writing',
        'definition': 'A precision measuring instrument used in workshops to measure internal and external physical dimensions.',
        'synonyms': 'vernier gauge, slide caliper, micrometer rule',
        'spanish_translation': 'Calibrador / Pie de rey',
        'audio': 'caliper.mp3',
        'image': 'caliper.png',
    },
    {
        'word_id': 'Bearing',
        'level': 'A1',
        'competence': 'Speaking',
        'definition': 'A machine element that constrains relative motion and reduces friction between moving mechanical parts.',
        'synonyms': 'ball bearing, roller bushing, pivot support',
        'spanish_translation': 'Rodamiento / Cojinete',
        'audio': 'bearing.mp3',
        'image': 'bearing.png',
    },
    {
        'word_id': 'Piston',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'A sliding cylinder component fitted inside an engine chamber that transfers combustion force to the crankshaft.',
        'synonyms': 'reciprocating plug, cylinder plunger, engine piston',
        'spanish_translation': 'Pistón',
        'audio': 'piston.mp3',
        'image': 'piston.png',
    },
    {
        'word_id': 'Valve',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'A mechanical device that directs, regulates, or controls the fluid flow by opening, closing, or partially obstructing passageways.',
        'synonyms': 'fluid regulator, check valve, flow limiter',
        'spanish_translation': 'Válvula',
        'audio': 'valve.mp3',
        'image': 'valve.png',
    },
    {
        'word_id': 'Pulley',
        'level': 'A1',
        'competence': 'Speaking',
        'definition': 'A wheel on an axle designed to support movement and change direction of a taut mechanical belt or rope.',
        'synonyms': 'sheave, belt wheel, transmission roller',
        'spanish_translation': 'Polea',
        'audio': 'pulley.mp3',
        'image': 'pulley.png',
    },
    {
        'word_id': 'Lubricant',
        'level': 'A1',
        'competence': 'Writing',
        'definition': 'A viscous substance introduced between touching surfaces in relative motion to minimize friction and wear.',
        'synonyms': 'industrial oil, grease, synthetic fluid',
        'spanish_translation': 'Lubricante / Grasa industrial',
        'audio': 'lubricant.mp3',
        'image': 'lubricant.png',
    },

    # ── A2 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Lathe',
        'level': 'A2',
        'competence': 'Speaking',
        'definition': 'A machine tool that rotates a workpiece about an axis of rotation to perform cutting, knurling, and facing operations.',
        'synonyms': 'turning machine, CNC lathe, metalworking lathe',
        'spanish_translation': 'Torno mecánico',
        'audio': 'lathe.mp3',
        'image': 'lathe.png',
    },
    {
        'word_id': 'Milling Machine',
        'level': 'A2',
        'competence': 'Reading',
        'definition': 'A versatile rotary cutter machine tool used in manufacturing to cut grooves, slots, and complex gear teeth into metal.',
        'synonyms': 'rotary milling tool, metal router, CNC mill',
        'spanish_translation': 'Fresadora',
        'audio': 'milling_machine.mp3',
        'image': 'milling_machine.png',
    },
    {
        'word_id': 'Spindle',
        'level': 'A2',
        'competence': 'Writing',
        'definition': 'A rotating axis of a machine tool that holds cutting tools or workpieces with high geometric precision.',
        'synonyms': 'drive shaft, machine arbor, revolving axis',
        'spanish_translation': 'Husillo principal',
        'audio': 'spindle.mp3',
        'image': 'spindle.png',
    },
    {
        'word_id': 'Micrometer',
        'level': 'A2',
        'competence': 'Grammar',
        'definition': 'A calibrated instrument incorporating a calibrated screw widely used for precise measurement of metal thicknesses.',
        'synonyms': 'screw gauge, precision caliper, micro meter',
        'spanish_translation': 'Micrómetro / Tornillo Palmer',
        'audio': 'micrometer.mp3',
        'image': 'micrometer.png',
    },
    {
        'word_id': 'Crankshaft',
        'level': 'A2',
        'competence': 'Speaking',
        'definition': 'A mechanical shaft driven by a crank mechanism that converts reciprocating linear piston motion into rotational torque.',
        'synonyms': 'eccentric shaft, engine crankshaft, drive crank',
        'spanish_translation': 'Cigüeñal',
        'audio': 'crankshaft.mp3',
        'image': 'crankshaft.png',
    },
    {
        'word_id': 'Hydraulic',
        'level': 'A2',
        'competence': 'Reading',
        'definition': 'A mechanical power transmission system operated through the controlled pressurized flow of liquids like mineral oil.',
        'synonyms': 'fluid powered, oil pressurized, liquid dynamic',
        'spanish_translation': 'Hidráulico',
        'audio': 'hydraulic.mp3',
        'image': 'hydraulic.png',
    },
    {
        'word_id': 'Pneumatic',
        'level': 'A2',
        'competence': 'Writing',
        'definition': 'A branch of mechanical engineering that makes use of pressurized gas and compressed air to actuate machinery.',
        'synonyms': 'air driven, compressed air system, pressurized gas',
        'spanish_translation': 'Neumático',
        'audio': 'pneumatic.mp3',
        'image': 'pneumatic.png',
    },
    {
        'word_id': 'Gasket',
        'level': 'A2',
        'competence': 'Grammar',
        'definition': 'A mechanical seal which fills the space between two mating surfaces to prevent leakage of fluids under compression.',
        'synonyms': 'flange seal, compression ring, joint washer',
        'spanish_translation': 'Junta de estanqueidad / Empaque',
        'audio': 'gasket.mp3',
        'image': 'gasket.png',
    },

    # ── B1 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Camshaft',
        'level': 'B1',
        'competence': 'Reading',
        'definition': 'A rotating shaft equipped with teardrop-shaped lobes designed to actuate the intake and exhaust poppet valves of an engine.',
        'synonyms': 'timing shaft, valve lobe shaft, cam driver',
        'spanish_translation': 'Árbol de levas',
        'audio': 'camshaft.mp3',
        'image': 'camshaft.png',
    },
    {
        'word_id': 'Flange',
        'level': 'B1',
        'competence': 'Writing',
        'definition': 'A protruding rim, edge, or collar used to attach pipes, valves, pumps, and other equipment to form a piping system.',
        'synonyms': 'pipe collar, connection lip, joint flange',
        'spanish_translation': 'Brida de tubería / Reborde',
        'audio': 'flange.mp3',
        'image': 'flange.png',
    },
    {
        'word_id': 'Coupling',
        'level': 'B1',
        'competence': 'Speaking',
        'definition': 'A mechanical device used to connect two shafts together at their ends for the purpose of transmitting rotational power.',
        'synonyms': 'shaft connector, flexible joint, torque link',
        'spanish_translation': 'Acoplamiento mecánico',
        'audio': 'coupling.mp3',
        'image': 'coupling.png',
    },
    {
        'word_id': 'Tolerance',
        'level': 'B1',
        'competence': 'Grammar',
        'definition': 'The permissible limit or limits of variation in a physical dimension, value, or material property of a machined part.',
        'synonyms': 'dimensional clearance, allowable variance, margin of error',
        'spanish_translation': 'Tolerancia dimensional',
        'audio': 'tolerance.mp3',
        'image': 'tolerance.png',
    },
    {
        'word_id': 'Welding',
        'level': 'B1',
        'competence': 'Writing',
        'definition': 'A fabrication process that joins materials, usually metals or thermoplastics, by causing coalescence via high heat.',
        'synonyms': 'metal fusion, arc joining, soldering',
        'spanish_translation': 'Soldadura industrial',
        'audio': 'welding.mp3',
        'image': 'welding.png',
    },
    {
        'word_id': 'Alloy',
        'level': 'B1',
        'competence': 'Reading',
        'definition': 'A metallic substance composed of two or more elements combined in solid solution to enhance tensile strength and corrosion resistance.',
        'synonyms': 'metallic blend, composite metal, metallurgical mix',
        'spanish_translation': 'Aleación metálica',
        'audio': 'alloy.mp3',
        'image': 'alloy.png',
    },
    {
        'word_id': 'Turbine',
        'level': 'B1',
        'competence': 'Speaking',
        'definition': 'A rotary mechanical device that extracts kinetic energy from a fast-flowing fluid stream and converts it into useful work.',
        'synonyms': 'impeller rotor, flow expander, rotary generator',
        'spanish_translation': 'Turbina',
        'audio': 'turbine.mp3',
        'image': 'turbine.png',
    },
    {
        'word_id': 'Pressure Gauge',
        'level': 'B1',
        'competence': 'Grammar',
        'definition': 'An analog dial or digital instrument designed to measure and monitor the hydrostatic pressure of fluids in closed pipes.',
        'synonyms': 'manometer, dial sensor, fluid indicator',
        'spanish_translation': 'Manómetro / Indicador de presión',
        'audio': 'pressure_gauge.mp3',
        'image': 'pressure_gauge.png',
    },

    # ── B2 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Actuator',
        'level': 'B2',
        'competence': 'Reading',
        'definition': 'A component of a mechanism that is responsible for moving and controlling an industrial system, such as a pneumatic cylinder.',
        'synonyms': 'control positioner, mechanical transducer, motion driver',
        'spanish_translation': 'Actuador industrial',
        'audio': 'actuator.mp3',
        'image': 'actuator.png',
    },
    {
        'word_id': 'Stator',
        'level': 'B2',
        'competence': 'Writing',
        'definition': 'The stationary structural portion of an electric motor or alternator that houses magnetic field windings surrounding the rotor.',
        'synonyms': 'stationary coil, magnetic frame, field stator',
        'spanish_translation': 'Estator electromecánico',
        'audio': 'stator.mp3',
        'image': 'stator.png',
    },
    {
        'word_id': 'Hardness',
        'level': 'B2',
        'competence': 'Speaking',
        'definition': 'A mechanical measure of the resistance of solid metallic matter to various kinds of permanent shape change when force is applied.',
        'synonyms': 'indentation resistance, Rockwell firmness, surface toughness',
        'spanish_translation': 'Dureza superficial del material',
        'audio': 'hardness.mp3',
        'image': 'hardness.png',
    },
    {
        'word_id': 'Governor',
        'level': 'B2',
        'competence': 'Grammar',
        'definition': 'An automated feedback device used to measure and regulate the rotational speed of a heavy prime mover engine automatically.',
        'synonyms': 'speed limiter, mechanical regulator, feedback control',
        'spanish_translation': 'Regulador centrífugo / Gobernador',
        'audio': 'governor.mp3',
        'image': 'governor.png',
    },
    {
        'word_id': 'Grinding',
        'level': 'B2',
        'competence': 'Writing',
        'definition': 'An abrasive machining process that uses a grinding wheel as the cutting tool to achieve extremely high dimensional accuracy.',
        'synonyms': 'abrasive finishing, surface grinding, fine polishing',
        'spanish_translation': 'Rectificado abrasivo',
        'audio': 'grinding.mp3',
        'image': 'grinding.png',
    },
    {
        'word_id': 'Thermocouple',
        'level': 'B2',
        'competence': 'Reading',
        'definition': 'An electrical transducer device consisting of two dissimilar electrical conductors forming an electrical junction at a temperature.',
        'synonyms': 'thermoelectric probe, temperature sensor, thermal junction',
        'spanish_translation': 'Termopar sensor de temperatura',
        'audio': 'thermocouple.mp3',
        'image': 'thermocouple.png',
    },
    {
        'word_id': 'Dynamometer',
        'level': 'B2',
        'competence': 'Speaking',
        'definition': 'An analytical laboratory device for simultaneously measuring torque and rotational speed of an engine to calculate brake horsepower.',
        'synonyms': 'dyno brake, torque bench, horsepower meter',
        'spanish_translation': 'Dinamómetro de banco',
        'audio': 'dynamometer.mp3',
        'image': 'dynamometer.png',
    },
    {
        'word_id': 'Conveyor',
        'level': 'B2',
        'competence': 'Grammar',
        'definition': 'A common piece of continuous mechanical handling equipment that transports industrial freight and bulk materials along automated routes.',
        'synonyms': 'feeder belt, transport line, industrial roller',
        'spanish_translation': 'Cinta transportadora industrial',
        'audio': 'conveyor.mp3',
        'image': 'conveyor.png',
    },
]


# ============================================================================
# 3. CATÁLOGO COMPLETO: PRODUCCIÓN MULTIMEDIA
# ============================================================================
MULTIMEDIA_TERMS = [
    # ── A1 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Storyboard',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'A graphic organizer consisting of illustrations or images displayed in sequence for the purpose of pre-visualizing a film or animation.',
        'synonyms': 'visual script, shot sequence, narrative draft',
        'spanish_translation': 'Guion gráfico / Storyboard',
        'audio': 'storyboard.mp3',
        'image': 'storyboard.png',
    },
    {
        'word_id': 'Vector',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'Computer graphics images defined in terms of 2D points and mathematical formulas that scale infinitely without pixelation.',
        'synonyms': 'scalable graphic, SVG path, geometric vector',
        'spanish_translation': 'Gráfico vectorial',
        'audio': 'vector.mp3',
        'image': 'vector.png',
    },
    {
        'word_id': 'Raster',
        'level': 'A1',
        'competence': 'Reading',
        'definition': 'A dot matrix data structure representing a generally rectangular grid of pixels viewable via a monitor or paper.',
        'synonyms': 'bitmap, pixel matrix, rasterized image',
        'spanish_translation': 'Mapa de bits / Raster',
        'audio': 'raster.mp3',
        'image': 'raster.png',
    },
    {
        'word_id': 'Layer',
        'level': 'A1',
        'competence': 'Speaking',
        'definition': 'A level of an image or timeline that can be edited independently in graphic software without altering background elements.',
        'synonyms': 'visual stratum, overlay plane, design tier',
        'spanish_translation': 'Capa de diseño',
        'audio': 'layer.mp3',
        'image': 'layer.png',
    },
    {
        'word_id': 'Timeline',
        'level': 'A1',
        'competence': 'Writing',
        'definition': 'A chronological workspace in multimedia editing suites displaying sequential video clips, audio tracks, and keyframes.',
        'synonyms': 'sequence editor, track track, duration ruler',
        'spanish_translation': 'Línea de tiempo',
        'audio': 'timeline.mp3',
        'image': 'timeline.png',
    },
    {
        'word_id': 'Resolution',
        'level': 'A1',
        'competence': 'Speaking',
        'definition': 'The detail an image holds, usually measured in horizontal by vertical pixel count such as 1920x1080.',
        'synonyms': 'pixel density, screen resolution, visual fidelity',
        'spanish_translation': 'Resolución de pantalla',
        'audio': 'resolution.mp3',
        'image': 'resolution.png',
    },
    {
        'word_id': 'Typography',
        'level': 'A1',
        'competence': 'Grammar',
        'definition': 'The art and technique of arranging type to make written language legible, readable, and appealing when displayed.',
        'synonyms': 'font design, typesetting, lettering style',
        'spanish_translation': 'Tipografía',
        'audio': 'typography.mp3',
        'image': 'typography.png',
    },
    {
        'word_id': 'Subtitle',
        'level': 'A1',
        'competence': 'Writing',
        'definition': 'Captions displayed at the bottom of a cinema or television screen that translate or transcribe the dialogue spoken.',
        'synonyms': 'closed caption, screen text, transcript line',
        'spanish_translation': 'Subtítulo',
        'audio': 'subtitle.mp3',
        'image': 'subtitle.png',
    },

    # ── A2 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Keyframe',
        'level': 'A2',
        'competence': 'Speaking',
        'definition': 'A drawing or parameter point that defines the starting and ending points of any smooth transition in animation.',
        'synonyms': 'motion anchor, animation node, timing frame',
        'spanish_translation': 'Fotograma clave / Keyframe',
        'audio': 'keyframe.mp3',
        'image': 'keyframe.png',
    },
    {
        'word_id': 'Rendering',
        'level': 'A2',
        'competence': 'Writing',
        'definition': 'The automated process of generating a photorealistic or non-photorealistic image from a 2D or 3D model by means of computer programs.',
        'synonyms': 'export raster, scene synthesis, graphic bake',
        'spanish_translation': 'Renderizado / Procesamiento final',
        'audio': 'rendering.mp3',
        'image': 'rendering.png',
    },
    {
        'word_id': 'Codec',
        'level': 'A2',
        'competence': 'Reading',
        'definition': 'A hardware or software algorithm that compresses and decompresses digital audio and video files for transport and playback.',
        'synonyms': 'compression algorithm, format encoder, stream parser',
        'spanish_translation': 'Códec de compresión',
        'audio': 'codec.mp3',
        'image': 'codec.png',
    },
    {
        'word_id': 'Aspect Ratio',
        'level': 'A2',
        'competence': 'Grammar',
        'definition': 'The proportional relationship between the width and height of an image or video screen, expressed as two numbers separated by a colon.',
        'synonyms': 'screen proportion, width-to-height ratio, frame format',
        'spanish_translation': 'Relación de aspecto (16:9 / 4:3)',
        'audio': 'aspect_ratio.mp3',
        'image': 'aspect_ratio.png',
    },
    {
        'word_id': 'Wireframe',
        'level': 'A2',
        'competence': 'Speaking',
        'definition': 'A low-fidelity visual schematic representation of a web page or digital interface layout that focuses on space allocation.',
        'synonyms': 'layout blueprint, structural skeleton, interface mock',
        'spanish_translation': 'Boceto estructural / Wireframe',
        'audio': 'wireframe.mp3',
        'image': 'wireframe.png',
    },
    {
        'word_id': 'Prototype',
        'level': 'A2',
        'competence': 'Reading',
        'definition': 'An interactive, clickable early simulation of a digital application used to test user experience flows and evaluate ideas.',
        'synonyms': 'interactive mockup, UX model, proof of concept',
        'spanish_translation': 'Prototipo interactivo',
        'audio': 'prototype.mp3',
        'image': 'prototype.png',
    },
    {
        'word_id': 'Audio Mixing',
        'level': 'A2',
        'competence': 'Writing',
        'definition': 'The post-production process by which multiple recorded sounds are combined, balanced, and adjusted into one or more final audio channels.',
        'synonyms': 'sound mastering, track blending, leveling',
        'spanish_translation': 'Mezcla y masterización de audio',
        'audio': 'audio_mixing.mp3',
        'image': 'audio_mixing.png',
    },
    {
        'word_id': 'Compression',
        'level': 'A2',
        'competence': 'Grammar',
        'definition': 'The algorithmic reduction in file size of digital multimedia without unacceptably degrading perceived acoustic or visual fidelity.',
        'synonyms': 'data compaction, bitrate encoding, size reduction',
        'spanish_translation': 'Compresión multimedia',
        'audio': 'compression.mp3',
        'image': 'compression.png',
    },

    # ── B1 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Color Grading',
        'level': 'B1',
        'competence': 'Reading',
        'definition': 'The visual process of altering and enhancing the color balance, saturation, and contrast of a motion picture digitally.',
        'synonyms': 'chromatic styling, digital intermediate, color timing',
        'spanish_translation': 'Etalonaje / Corrección de color',
        'audio': 'color_grading.mp3',
        'image': 'color_grading.png',
    },
    {
        'word_id': 'Foley',
        'level': 'B1',
        'competence': 'Speaking',
        'definition': 'The reproduction of everyday sound effects that are added to films, videos, and other media in post-production to enhance quality.',
        'synonyms': 'sound FX, acoustic reproduction, incidental audio',
        'spanish_translation': 'Efectos de sonido sala / Foley',
        'audio': 'foley.mp3',
        'image': 'foley.png',
    },
    {
        'word_id': 'Masking',
        'level': 'B1',
        'competence': 'Writing',
        'definition': 'A graphic technique where a shape or path is used to hide or reveal specific sections of an underlying image or video clip.',
        'synonyms': 'matte clipping, alpha stencil, reveal cutout',
        'spanish_translation': 'Máscara de recorte',
        'audio': 'masking.mp3',
        'image': 'masking.png',
    },
    {
        'word_id': 'Compositing',
        'level': 'B1',
        'competence': 'Grammar',
        'definition': 'The creative practice of combining visual elements from separate sources into single seamless images, creating the illusion of a whole.',
        'synonyms': 'visual FX blend, multi-plate merge, VFX layering',
        'spanish_translation': 'Composición digital VFX',
        'audio': 'compositing.mp3',
        'image': 'compositing.png',
    },
    {
        'word_id': 'Rigging',
        'level': 'B1',
        'competence': 'Speaking',
        'definition': 'The technical process of creating a digital skeleton structure with inverse kinematics for a 3D character mesh so it can be animated.',
        'synonyms': 'skeletal deformation, bone setup, IK binding',
        'spanish_translation': 'Estructura de huesos / Rigging',
        'audio': 'rigging.mp3',
        'image': 'rigging.png',
    },
    {
        'word_id': 'Texture',
        'level': 'B1',
        'competence': 'Reading',
        'definition': 'A 2D digital image applied to the surface of a 3D polygon mesh model to impart realistic visual detail, diffuse color, and relief.',
        'synonyms': 'diffuse map, surface wrap, UV texture',
        'spanish_translation': 'Textura y mapa 3D',
        'audio': 'texture.mp3',
        'image': 'texture.png',
    },
    {
        'word_id': 'Framerate',
        'level': 'B1',
        'competence': 'Writing',
        'definition': 'The frequency or rate at which consecutive digital images or frames appear on a display, expressed in frames per second (fps).',
        'synonyms': 'FPS rate, temporal frequency, frame speed',
        'spanish_translation': 'Tasa de fotogramas por segundo (FPS)',
        'audio': 'framerate.mp3',
        'image': 'framerate.png',
    },
    {
        'word_id': 'Bitrate',
        'level': 'B1',
        'competence': 'Grammar',
        'definition': 'The quantity of data bits transferred or processed per unit of time in an audio or video multimedia stream.',
        'synonyms': 'data throughput, streaming bandwidth, bit velocity',
        'spanish_translation': 'Tasa de bits / Bitrate',
        'audio': 'bitrate.mp3',
        'image': 'bitrate.png',
    },

    # ── B2 ──────────────────────────────────────────────────────────────────
    {
        'word_id': 'Chroma Key',
        'level': 'B2',
        'competence': 'Reading',
        'definition': 'A visual effects technique for compositing two images or video streams together based on color hues, typically green or blue.',
        'synonyms': 'green screen, color separation overlay, blue screen',
        'spanish_translation': 'Croma / Pantalla verde',
        'audio': 'chroma_key.mp3',
        'image': 'chroma_key.png',
    },
    {
        'word_id': 'Tweening',
        'level': 'B2',
        'competence': 'Writing',
        'definition': 'The computational generation of intermediate frames between two images in order to give the appearance that the first evolves smoothly.',
        'synonyms': 'inbetweening, temporal interpolation, motion ease',
        'spanish_translation': 'Interpolación de movimiento',
        'audio': 'tweening.mp3',
        'image': 'tweening.png',
    },
    {
        'word_id': 'Color Gamut',
        'level': 'B2',
        'competence': 'Speaking',
        'definition': 'The entire range or subset of colors that a specific display device, printer, or digital color space like DCI-P3 can accurately reproduce.',
        'synonyms': 'chromatic space, color spectrum, gamut boundary',
        'spanish_translation': 'Gama de color / Gamut',
        'audio': 'color_gamut.mp3',
        'image': 'color_gamut.png',
    },
    {
        'word_id': 'Alpha Channel',
        'level': 'B2',
        'competence': 'Grammar',
        'definition': 'A dedicated color component channel that controls the degree of transparency of an image or composited video layer.',
        'synonyms': 'opacity map, transparency mask, matte channel',
        'spanish_translation': 'Canal alfa / Transparencia',
        'audio': 'alpha_channel.mp3',
        'image': 'alpha_channel.png',
    },
    {
        'word_id': 'Shutter Speed',
        'level': 'B2',
        'competence': 'Writing',
        'definition': 'The length of time when the digital sensor or film inside a camera is exposed to incoming light, determining motion blur.',
        'synonyms': 'exposure duration, shutter time, sensor interval',
        'spanish_translation': 'Velocidad de obturación',
        'audio': 'shutter_speed.mp3',
        'image': 'shutter_speed.png',
    },
    {
        'word_id': 'Motion Blur',
        'level': 'B2',
        'competence': 'Reading',
        'definition': 'The apparent streaking of rapidly moving visual objects in a still image or sequence of frames due to rapid movement during exposure.',
        'synonyms': 'temporal smear, dynamic blur, velocity streak',
        'spanish_translation': 'Desenfoque de movimiento',
        'audio': 'motion_blur.mp3',
        'image': 'motion_blur.png',
    },
    {
        'word_id': 'Depth of Field',
        'level': 'B2',
        'competence': 'Speaking',
        'definition': 'The distance between the nearest and the farthest objects that are in acceptably sharp focus in an image produced by an optical lens.',
        'synonyms': 'focus plane, bokeh depth, optical focal range',
        'spanish_translation': 'Profundidad de campo / Bokeh',
        'audio': 'depth_of_field.mp3',
        'image': 'depth_of_field.png',
    },
    {
        'word_id': 'Equalization',
        'level': 'B2',
        'competence': 'Grammar',
        'definition': 'The technical audio processing of adjusting the balance between frequency components within an electronic audio signal.',
        'synonyms': 'EQ filter, frequency curve, spectral balance',
        'spanish_translation': 'Ecualización espectral (EQ)',
        'audio': 'equalization.mp3',
        'image': 'equalization.png',
    },
]


PROGRAM_SPECS = [
    {
        'subject_id': 'ADSO',
        'subject_description': 'Análisis y Desarrollo de Software',
        'program_name': 'Análisis y Desarrollo de Software',
        'ficha_code': '2670142',
        'terms': ADSO_TERMS,
    },
    {
        'subject_id': 'MECANICA',
        'subject_description': 'Mecánica Industrial',
        'program_name': 'Mecánica Industrial',
        'ficha_code': '3520681',
        'terms': MECANICA_TERMS,
    },
    {
        'subject_id': 'MULTIMEDIA',
        'subject_description': 'Producción Multimedia',
        'program_name': 'Producción Multimedia',
        'ficha_code': '2554901',
        'terms': MULTIMEDIA_TERMS,
    },
]


class Command(BaseCommand):
    help = 'Puebla de manera masiva y sin duplicados los 3 Diccionarios Técnicos: ADSO, Mecánica Industrial y Producción Multimedia'

    def add_arguments(self, parser):
        parser.add_argument(
            '--program',
            type=str,
            default='all',
            help='Filtrar ingesta por programa: ADSO, MECANICA, MULTIMEDIA o all (predeterminado)',
        )

    def handle(self, *args, **options):
        selected_program = options.get('program', 'all').strip().upper()
        self.stdout.write(self.style.MIGRATE_HEADING("=== INICIANDO INGESTA DE LOS 3 DICCIONARIOS TÉCNICOS SENA ==="))

        # Asegurar buckets y permisos de lectura pública en MinIO
        try:
            self.stdout.write("Verificando buckets de MinIO y políticas públicas de descarga...")
            StorageService.ensure_all_buckets()
            self.stdout.write(self.style.SUCCESS("Buckets de MinIO listos (dictionary-images, dictionary-audios, dictionary-videos)."))
        except Exception as bucket_err:
            self.stdout.write(self.style.WARNING(f"Aviso MinIO: {bucket_err}"))

        grand_total_created = 0
        grand_total_updated = 0

        for spec in PROGRAM_SPECS:
            code = spec['subject_id']
            if selected_program != 'ALL' and selected_program not in code:
                continue

            # 1. Asegurar la Asignatura en base de datos
            subject, _ = Subject.objects.get_or_create(
                subject_id=spec['subject_id'],
                defaults={'description': spec['subject_description']}
            )
            self.stdout.write(self.style.SUCCESS(f"\n[PROGRAMA] {subject.subject_id} - {spec['program_name']} (Ficha: {spec['ficha_code']})"))

            created_count = 0
            updated_count = 0

            for item in spec['terms']:
                clean_word = item['word_id'].strip()
                slug = slugify(clean_word)
                audio_name = item.get('audio') or f"{slug}.mp3"
                image_name = item.get('image') or f"{slug}.png"

                obj, created = DigitalDictionary.objects.update_or_create(
                    word_id=clean_word,
                    subject=subject,
                    defaults={
                        'definition': item['definition'][:255],
                        'synonyms': item.get('synonyms', '')[:255],
                        'audio': audio_name[:255],
                        'image': image_name[:255],
                        'video': item.get('video', '')[:255],
                        'level': item.get('level', 'A1'),
                        # Directriz pedagógica SENA: Todo el vocabulario técnico corresponde a Reading (Comprensión y Vocabulario)
                        'competence': 'Speaking' if str(item.get('competence', '')).lower() == 'speaking' else 'Reading',
                        'program': spec['program_name'],
                        'spanish_translation': item.get('spanish_translation', '')[:255],
                        'ficha': spec['ficha_code'],
                    }
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            grand_total_created += created_count
            grand_total_updated += updated_count

            total_for_prog = DigitalDictionary.objects.filter(subject=subject).count()
            self.stdout.write(
                f"  -> {spec['subject_id']}: {created_count} creados, {updated_count} actualizados. Total en BD: {total_for_prog}"
            )

        total_db = DigitalDictionary.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"\n[RESUMEN] Total términos procesados: {grand_total_created} creados, {grand_total_updated} actualizados.\n"
            f"[RESUMEN] Total global de términos en DigitalDictionary: {total_db}\n"
        ))

        # ── Ingesta del Perfil de Instructor y Aprendices de Demostración ──
        self._seed_instructor_and_test_data()

        self.stdout.write(self.style.SUCCESS("=== INGESTA COMPLETA FINALIZADA EXITOSAMENTE ==="))

    def _seed_instructor_and_test_data(self):
        """
        Garantiza la existencia del usuario Instructor con credenciales institucionales conocidas:
        - Email: instructor@sena.edu.co / Clave: sena2026*
        - Fichas vinculadas: ADSO 2670142, Mecánica 3520681, Multimedia 2554901
        - Aprendices, solicitudes de ficha y resultados de prueba (TestResult) listos para seguimiento en vivo.
        """
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== CONFIGURANDO PERFIL INSTRUCTOR Y DATOS DE PRUEBA EN VIVO ==="))

        # 1. Crear / Actualizar Persona e Instructor Principal
        inst_person, _ = Person.objects.update_or_create(
            email='instructor@sena.edu.co',
            defaults={
                'password': make_password('sena2026*'),
                'doc_type': 'CC',
                'doc_num': '1098765432',
                'first_name': 'Carlos',
                'last_name': 'Mendoza',
                'phone_num': '3109876543',
            }
        )

        inst_user, _ = User.objects.update_or_create(
            person=inst_person,
            defaults={
                'role_id': 'INSTRUCTOR',
                'status': 'ACTIVO',
                'program': 'ADSO - Ficha 2670142 / Mecánica - Ficha 3520681 / Multimedia - Ficha 2554901',
            }
        )
        self.stdout.write(self.style.SUCCESS(f"Instructor activo: {inst_person.email} (rol: {inst_user.role_id})"))

        # 2. Aprendices de Demostración por Ficha
        students_data = [
            {
                'email': 'aprendiz.adso@sena.edu.co',
                'doc_num': '1011223344',
                'first_name': 'Juan David',
                'last_name': 'Pérez',
                'program': 'Análisis y Desarrollo de Software - Ficha 2670142',
                'ficha_code': '2670142',
                'score': 85,
                'level': 'B1',
                'speaking': 80,
                'writing': 90,
                'correct': 13,
                'total': 15,
            },
            {
                'email': 'aprendiz.mecanica@sena.edu.co',
                'doc_num': '1022334455',
                'first_name': 'Laura',
                'last_name': 'Gómez',
                'program': 'Mecánica Industrial - Ficha 3520681',
                'ficha_code': '3520681',
                'score': 73,
                'level': 'A2',
                'speaking': 70,
                'writing': 75,
                'correct': 11,
                'total': 15,
            },
            {
                'email': 'aprendiz.multimedia@sena.edu.co',
                'doc_num': '1033445566',
                'first_name': 'Santiago',
                'last_name': 'Silva',
                'program': 'Producción Multimedia - Ficha 2554901',
                'ficha_code': '2554901',
                'score': 92,
                'level': 'B2',
                'speaking': 90,
                'writing': 95,
                'correct': 14,
                'total': 15,
            },
        ]

        for s_info in students_data:
            s_person, _ = Person.objects.update_or_create(
                email=s_info['email'],
                defaults={
                    'password': make_password('sena2026*'),
                    'doc_type': 'CC',
                    'doc_num': s_info['doc_num'],
                    'first_name': s_info['first_name'],
                    'last_name': s_info['last_name'],
                    'phone_num': '3001234567',
                }
            )

            s_user, _ = User.objects.update_or_create(
                person=s_person,
                defaults={
                    'role_id': 'APRENDIZ',
                    'status': 'EN_FORMACION',
                    'program': s_info['program'],
                }
            )

            # Solicitudes de Ficha
            FichaRequest.objects.update_or_create(
                user=s_user,
                person=s_person,
                ficha_code=s_info['ficha_code'],
                defaults={
                    'program_name': s_info['program'],
                    'status': 'APROBADA',
                    'assigned_instructor': inst_user,
                    'admin_notes': 'Aprobado formalmente por instructor titular.',
                }
            )

            # TestResult con auditoría pedagógica detallada y respuestas textuales reales
            mock_answers = [
                {
                    'question_id': 1,
                    'question_text': 'What technical term does this definition refer to?',
                    'type': 'multiple',
                    'competence': 'Reading - Vocabulario',
                    'user_answer_text': 'Middleware',
                    'correct_answer_text': 'Middleware',
                    'is_correct': True,
                    'is_unanswered': False,
                    'technical_term': 'Middleware',
                    'feedback': "Excelente dominio del concepto técnico 'Middleware'.",
                },
                {
                    'question_id': 2,
                    'question_text': 'Order the sentence components into a grammatically correct structure:',
                    'type': 'multiple',
                    'competence': 'Writing - Gramática y Sintaxis',
                    'user_answer_text': 'The middleware validates the authentication token before the request.',
                    'correct_answer_text': 'The middleware validates the authentication token before the request.',
                    'is_correct': True,
                    'is_unanswered': False,
                    'technical_term': 'Token Validation',
                    'feedback': 'Estructura sintáctica y ordenamiento gramatical correcto.',
                },
                {
                    'question_id': 3,
                    'question_text': 'Pronounce the technical term with clear phonetics:',
                    'type': 'speaking',
                    'competence': 'Speaking',
                    'user_answer_text': 'Audio grabado por el aprendiz (Authentication)',
                    'correct_answer_text': 'Authentication',
                    'is_correct': True,
                    'is_unanswered': False,
                    'technical_term': 'Authentication',
                    'feedback': 'Pronunciación clara con 88% de similitud fonética.',
                },
                {
                    'question_id': 4,
                    'question_text': 'Complete the sentence with the correct grammatical form or collocation:',
                    'type': 'multiple',
                    'competence': 'Writing - Gramática y Sintaxis',
                    'user_answer_text': 'INCORRECTO / SIN RESPONDER',
                    'correct_answer_text': 'run',
                    'is_correct': False,
                    'is_unanswered': True,
                    'technical_term': 'Unit Testing',
                    'feedback': 'Reactivo omitido o tiempo agotado antes de responder.',
                },
            ]

            TestResult.objects.update_or_create(
                user=s_user,
                defaults={
                    'score': s_info['score'],
                    'level': s_info['level'],
                    'character': 'Analítico',
                    'correct_answers': s_info['correct'],
                    'total_questions': s_info['total'],
                    'speaking_score': s_info['speaking'],
                    'writing_score': s_info['writing'],
                    'level_scores': {'A1': 100, 'A2': 85, 'B1': s_info['score']},
                    'feedback': f'Excelente desempeño en {s_info["program"]}. Progreso consistente en las 4 competencias.',
                    'duration': '14m 20s',
                    'process': {'answers': mock_answers},
                }
            )
            self.stdout.write(f"  -> Aprendiz registrado con prueba técnica: {s_person.email} ({s_info['level']} - {s_info['score']}%)")

        self.stdout.write(self.style.SUCCESS("✓ Datos de demostración listos para el panel docente."))
