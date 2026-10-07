-- postgres/init/02_seed_adso.sql
-- Insercion idempotente de Vocabulario Tecnico ADSO (64 terminos balanceados A1-B2)
CREATE SCHEMA IF NOT EXISTS worklex;

-- Si la tabla users_subject existe, asegurar asignatura ADSO
DO $body$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'worklex' AND table_name = 'users_subject') THEN
        INSERT INTO worklex.users_subject (subject_id, description)
        VALUES ('ADSO', 'Analisis y Desarrollo de Software (SENA)')
        ON CONFLICT (subject_id) DO UPDATE SET description = EXCLUDED.description;
    END IF;
END $body$;

-- Precarga de terminos si la tabla users_digitaldictionary existe
DO $body$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'worklex' AND table_name = 'users_digitaldictionary') THEN
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Variable', 'A named storage location in memory containing data that can be modified during program execution.', 'identifier, container, data holder', 'variable.mp3', '', 'variable.png', 'A1', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Button', 'A graphical user interface element clicked by a user to trigger a specific action or event in the system.', 'UI control, clickable element, trigger', 'button.mp3', '', 'button.png', 'A1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Code', 'Instructions written in a structured programming language for a computer to execute.', 'source code, script, program instructions', 'code.mp3', '', 'code.png', 'A1', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Input', 'Data or signals provided to a computer program for processing by an external user or device.', 'entry data, user input, parameter', 'input.mp3', '', 'input.png', 'A1', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Output', 'Information produced and delivered by a software program after processing input data.', 'result, displayed data, return value', 'output.mp3', '', 'output.png', 'A1', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('File', 'A digital resource recorded on a storage device that contains structured text, code, or media data.', 'document, record, digital resource', 'file.mp3', '', 'file.png', 'A1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Integer', 'A primitive numeric data type representing whole numbers without fractional components.', 'whole number, int, digit', 'integer.mp3', '', 'integer.png', 'A1', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('String', 'An immutable sequence of characters used in programming to represent textual information.', 'text sequence, literal, string literal', 'string.mp3', '', 'string.png', 'A1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Boolean', 'A logical data type that can have only one of two possible truth values: true or false.', 'truth value, binary flag, logical state', 'boolean.mp3', '', 'boolean.png', 'A1', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Comment', 'A programmer-readable note in source code ignored by compilers and interpreters to explain program logic.', 'inline note, documentation, code annotation', 'comment.mp3', '', 'comment.png', 'A1', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Syntax', 'The set of formal grammatical rules governing the valid structure and combination of symbols in a language.', 'grammar rules, language format, code structure', 'syntax.mp3', '', 'syntax.png', 'A1', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Server', 'A dedicated computing hardware or software application providing resources and data to client devices.', 'host computer, provider, node', 'server.mp3', '', 'server.png', 'A1', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Screen', 'The visual display area of an application or device presenting user interfaces and graphic assets.', 'display view, viewport, UI view', 'screen.mp3', '', 'screen.png', 'A1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Icon', 'A compact visual pictogram representing software functions, file types, or navigation shortcuts.', 'glyph, symbol, visual indicator', 'icon.mp3', '', 'icon.png', 'A1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Click', 'The user gesture of pressing a mouse button or tapping on a touchscreen control to trigger an event.', 'tap, mouse press, trigger interaction', 'click.mp3', '', 'click.png', 'A1', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Password', 'A secret sequence of characters used by users to authenticate identity and access secured systems.', 'passcode, secret key, credential', 'password.mp3', '', 'password.png', 'A1', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Function', 'A reusable block of organized code designed to perform a single specific computation and optionally return a value.', 'method, procedure, routine', 'function.mp3', '', 'function.png', 'A2', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Database', 'An organized collection of structured data stored electronically in a relational or document-oriented management system.', 'data store, DB, repository', 'database.mp3', '', 'database.png', 'A2', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Array', 'An indexed, ordered data structure storing multiple elements of similar or generic types sequentially in memory.', 'list, vector, sequence collection', 'array.mp3', '', 'array.png', 'A2', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Loop', 'A programmatic control flow structure that repeats a sequence of statements until a termination condition is met.', 'iteration, cycle, repetition structure', 'loop.mp3', '', 'loop.png', 'A2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Frontend', 'The client-side presentation layer of an application directly engaged and navigated by end users.', 'client-side, user interface, UI tier', 'frontend.mp3', '', 'frontend.png', 'A2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Backend', 'The server-side layer managing business logic, algorithmic processing, and database interactions.', 'server-side, application core, data tier', 'backend.mp3', '', 'backend.png', 'A2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Condition', 'A logical boolean expression evaluated by conditional branching statements like if-else to direct program flow.', 'predicate, decision test, boolean check', 'condition.mp3', '', 'condition.png', 'A2', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Framework', 'A standardized architectural software platform providing generic foundation libraries to accelerate development.', 'development scaffolding, platform, software toolkit', 'framework.mp3', '', 'framework.png', 'A2', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Algorithm', 'A finite, unambiguous sequence of computational instructions designed to solve a well-defined problem.', 'procedure, computation rule, logic recipe', 'algorithm.mp3', '', 'algorithm.png', 'A2', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Object', 'An instance of a class encapsulating state variables and behaviors defined as executable methods.', 'class instance, entity, structured variable', 'object.mp3', '', 'object.png', 'A2', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Class', 'An extensible programmatic blueprint creating objects, providing initial values for state and implementations of behavior.', 'type template, blueprint, entity definition', 'class.mp3', '', 'class.png', 'A2', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Parameter', 'A special variable declared in a function signature used to receive values passed into the routine during a call.', 'formal argument, input variable, signature attribute', 'parameter.mp3', '', 'parameter.png', 'A2', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Return', 'A statement ending function execution and passing a resulting value back to the invoking caller context.', 'exit value, yield, output return', 'return.mp3', '', 'return.png', 'A2', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Method', 'A function declared inside a class or object definition operating directly on its internal member data.', 'member function, object operation, behavior', 'method.mp3', '', 'method.png', 'A2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Interface', 'A contract specification defining the public signatures of methods without providing their internal concrete implementation.', 'type contract, API definition, boundary protocol', 'interface.mp3', '', 'interface.png', 'A2', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Query', 'A formal request for data retrieval or modification submitted to a database engine using declarative syntax.', 'database command, SQL statement, data search', 'query.mp3', '', 'query.png', 'A2', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Authentication', 'The security process of confirming the true digital identity of a user, API client, or communicating system.', 'identity verification, login validation, credential check', 'authentication.mp3', '', 'authentication.png', 'B1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Endpoint', 'A specific network URL location exposed by a web service to receive HTTP requests and return resources.', 'API route, service URI, webhook target', 'endpoint.mp3', '', 'endpoint.png', 'B1', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Refactoring', 'The disciplined software engineering process of restructuring existing code without altering external functional behavior.', 'code optimization, architectural cleanup, code hygiene', 'refactoring.mp3', '', 'refactoring.png', 'B1', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Repository', 'A central storage location managed by version control containing source code, project history, and revision metadata.', 'versioned codebase, Git repo, software depot', 'repository.mp3', '', 'repository.png', 'B1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Middleware', 'A modular software pipeline component that intercepts HTTP requests and responses to process authentication or logging.', 'request pipeline interceptor, filter layer, hook processor', 'middleware.mp3', '', 'middleware.png', 'B1', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Debugging', 'The analytical process of finding, tracing, and resolving defect anomalies and run-time errors in software code.', 'troubleshooting, defect isolation, error fixing', 'debugging.mp3', '', 'debugging.png', 'B1', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Component', 'An encapsulated, modular software building block containing its own markup, styling, and reactive logic.', 'modular unit, UI module, reusable block', 'component.mp3', '', 'component.png', 'B1', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Controller', 'An architectural mediator component in MVC that coordinates model data with view rendering based on user requests.', 'request handler, coordinator, view dispatcher', 'controller.mp3', '', 'controller.png', 'B1', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Validation', 'The automated verification ensuring incoming user input data conforms to structural types and domain business constraints.', 'data verification, sanitization check, integrity rule', 'validation.mp3', '', 'validation.png', 'B1', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Migration', 'A version-controlled set of instructions managing evolutionary changes to database schemas over time.', 'schema change, DB versioning, evolutionary script', 'migration.mp3', '', 'migration.png', 'B1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Dependency', 'An external software library or module required by an application to compile, execute, and deliver functionality.', 'external package, package module, requisite library', 'dependency.mp3', '', 'dependency.png', 'B1', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Exception', 'An anomalous condition or error event encountered during execution interrupting normal programmatic instruction flow.', 'runtime fault, caught error, signal disruption', 'exception.mp3', '', 'exception.png', 'B1', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Inheritance', 'An object-oriented programming mechanism where a derived class acquires fields and behaviors from an ancestor base class.', 'class extension, subtyping, hierarchical reuse', 'inheritance.mp3', '', 'inheritance.png', 'B1', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Encapsulation', 'The design technique of bundling data with the methods that operate on it and restricting direct access to internal state.', 'data hiding, access control, state protection', 'encapsulation.mp3', '', 'encapsulation.png', 'B1', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Testing', 'The automated or manual verification procedure assessing whether a software system meets design specifications and criteria.', 'quality assurance, unit validation, system audit', 'testing.mp3', '', 'testing.png', 'B1', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Branch', 'An independent line of development within version control allowing developers to work in isolation before merging.', 'isolated track, feature branch, code divergence', 'branch.mp3', '', 'branch.png', 'B1', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Microservices', 'An architectural pattern structuring an application as a collection of loosely coupled, independently deployable services.', 'distributed services, modular architecture, decoupled backend', 'microservices.mp3', '', 'microservices.png', 'B2', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Continuous Integration', 'The DevOps software engineering practice where members merge code changes frequently into a shared repository verified by automated builds.', 'CI/CD pipeline, automated build, integration testing', 'continuous_integration.mp3', '', 'continuous_integration.png', 'B2', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Scalability', 'The capability of a software system to handle growing workloads gracefully by adding hardware capacity or cloud resources.', 'capacity expansion, elastic growth, throughput scaling', 'scalability.mp3', '', 'scalability.png', 'B2', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Polymorphism', 'The object-oriented programming capability where distinct classes implement identical interface methods with tailored behaviors.', 'interface variation, dynamic dispatch, multi-form execution', 'polymorphism.mp3', '', 'polymorphism.png', 'B2', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Vulnerability', 'A flaw or weakness in application logic, dependencies, or system configuration that can be exploited by an attacker.', 'security weakness, exploit opening, CVE defect', 'vulnerability.mp3', '', 'vulnerability.png', 'B2', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Asynchronous', 'Non-blocking computational execution that allows a system to process independent tasks while awaiting I/O operations.', 'non-blocking, event-driven, concurrent routine', 'asynchronous.mp3', '', 'asynchronous.png', 'B2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Deployment', 'The release workflow of packaging, configuring, and publishing tested software artifacts to a target production cloud server.', 'production release, system provisioning, software delivery', 'deployment.mp3', '', 'deployment.png', 'B2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Encryption', 'The cryptographic transformation of plain text into cipher text using mathematical keys to safeguard data at rest and in transit.', 'cryptographic cipher, data protection, secure hashing', 'encryption.mp3', '', 'encryption.png', 'B2', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Concurrency', 'The composition of independently executing computations sharing execution resources without compromising consistency.', 'parallel execution, multi-threading, simultaneous tasks', 'concurrency.mp3', '', 'concurrency.png', 'B2', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Virtualization', 'The creation of software-based virtual computing platforms, storage devices, and networks on top of physical hardware.', 'hypervisor platform, VM emulation, hardware abstraction', 'virtualization.mp3', '', 'virtualization.png', 'B2', 'Reading', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Orchestration', 'The automated coordination, scheduling, and lifecycle management of containerized applications across distributed server clusters.', 'container management, cluster coordination, automated scheduling', 'orchestration.mp3', '', 'orchestration.png', 'B2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Optimization', 'The algorithmic refinement of source code and configurations to reduce execution latency and minimize hardware memory consumption.', 'performance tuning, algorithmic speedup, efficiency enhancement', 'optimization.mp3', '', 'optimization.png', 'B2', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Latency', 'The time interval measured between initiating an electronic network request and receiving the initial packet of response data.', 'network delay, response lag, ping duration', 'latency.mp3', '', 'latency.png', 'B2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Throughput', 'The volumetric rate at which a computing system processes transactions or transmits packets over a given timeframe.', 'processing bandwidth, transfer rate, request volume', 'throughput.mp3', '', 'throughput.png', 'B2', 'Grammar', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Observability', 'The software capability to infer internal states of a distributed cloud system by analyzing telemetry metrics, logs, and traces.', 'telemetry analysis, APM monitoring, system visibility', 'observability.mp3', '', 'observability.png', 'B2', 'Speaking', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
        INSERT INTO worklex.users_digitaldictionary (word_id, definition, synonyms, audio, video, image, level, competence, subject_id)
        VALUES ('Refactoring Pattern', 'A proven, formal structural technique applied to eliminate architectural technical debt in complex codebases.', 'design pattern, architectural idiom, structural recipe', 'refactoring_pattern.mp3', '', 'refactoring_pattern.png', 'B2', 'Writing', 'ADSO')
        ON CONFLICT (word_id, subject_id) DO UPDATE SET definition = EXCLUDED.definition, synonyms = EXCLUDED.synonyms, audio = EXCLUDED.audio, image = EXCLUDED.image, level = EXCLUDED.level, competence = EXCLUDED.competence;
    END IF;
END $body$;
