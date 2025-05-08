<?php
// El webhook es un receptor escucha los mensajes que Jira envía cuando cambia el estado de una historia (issue). Según ese estado, decide si debe bloquear o desbloquear una rama en GitHub.

require_once __DIR__ . '/../../src/PeticionJira.php'; // Importa la clase que procesa los datos del payload de Jira
require_once __DIR__ . '/../../src/BloqueadorDeRamas.php'; // tiene metodos para bloquear o desbloquear ramas usando la API de GitHub.
$config = require __DIR__ . '/../../config/config.php'; // tiene lo configurable token, estados que activan el bloqueo, rutas de log, repos, etc.

$rawInput = file_get_contents('php://input'); // Captura el cuerpo (payload) crudo de la petición HTTP (JSON de Jira)

if (empty($rawInput)) { // Si no hay contenido en el payload...
    http_response_code(400); // Retorna error 400 - Bad Request
    echo "No se recibió ningún payload."; // Muestra mensaje de error
    exit; // Termina la ejecución del script
}

file_put_contents(
    $config['log_path'],
    date('Y-m-d H:i:s') . " 📩 Payload recibido:\n". $rawInput . "\n\n",
    FILE_APPEND
); // Guarda en el log el payload recibido con marca de tiempo

$json = json_decode($rawInput, true); // Convierte el JSON en array asociativo de PHP validar para que lo hace

if ($json === null) { // Si la decodificación falla (payload no es JSON válido)...
    http_response_code(400); // Devuelve error 400
    echo "El payload no es un JSON válido."; // Muestra mensaje de error
    file_put_contents(
        $config['log_path'],
        date('Y-m-d H:i:s') . " ❌ Error: Payload no es JSON válido.\n\n",
        FILE_APPEND
    ); // Registra el error en el log
    exit; // Termina ejecución
}

$datos = PeticionJira::extraerDatosDesdePayload($json); // De la clase peticion jira que se encuentra en el archivo peticionjira.php. va a extraer datos necesarios del payload (estado, issue, rama) utilizando el metodo extraerDatosDesdePayload

if (!$datos) { // Si no se pudieron extraer los datos...
    file_put_contents(
        $config['log_path'],
        date('Y-m-d H:i:s') . " ⚠️ No se pudo extraer datos del payload.\n\n",
        FILE_APPEND
    ); // Guarda un mensaje de advertencia en el log
    exit; // Termina ejecución
}

file_put_contents(
    $config['log_path'],
    date('Y-m-d H:i:s') . " 📩 Cambio recibido: Issue '{$datos['issue']}' cambió a estado '{$datos['estado']}'\n",
    FILE_APPEND
); // Registra en el log el issue y el nuevo estado recibido

$debeBloquear = in_array(
    strtoupper($datos['estado']),
    array_map('strtoupper', $config['estados_bloqueo'])
        // Asigna a la vaariable un valor booleano según el estado que obtiene de la peticion de Jira.
);//si el estado de Jira está en el listado para bloquear, retorna "true" de lo contrario retornará "false"

$accion = $debeBloquear ? 'bloquear' : 'desbloquear'; // Define la lógica de la condicion, si la variable $debeBloquear retorna un true, a la variable $accion se le asigna "Bloquear"
                                                      // De lo contrario, la variable $accion se le asignará "desbloquear"

foreach ($config['repositorios'] as $repo) { // Recorre cada uno de los repositorios configurados en el archivo config.php
    $bloqueador = new BloqueadorDeRamas($config['github_token'], $repo); // Crea una instancia del bloqueador con el token de GitHub y el nombre del repo
    $resultado = $bloqueador->$accion($datos['rama']); // Llama dinámicamente al metodo bloquear() o desbloquear() según corresponda

    if ($resultado['codigo'] === 200 || $resultado['codigo'] === 204) { // Si la respuesta de la API de GitHub fue exitosa...
        file_put_contents(
            $config['log_path'],
            date('Y-m-d H:i:s') . " ✅ Rama '{$datos['rama']}' en repositorio '{$repo}' fue " . ($accion === 'bloquear' ? 'bloqueada' : 'desbloqueada') . " exitosamente.\n",
            FILE_APPEND
        ); // Registra en el log el éxito de la operación
    } else { // Si ocurrió un error con la operación...
        file_put_contents(
            $config['log_path'],
            date('Y-m-d H:i:s') . " ❌ Error al {$accion} rama '{$datos['rama']}' en repositorio '{$repo}': {$resultado['error']}\n",
            FILE_APPEND
        ); // Registra el error principal en el log
        file_put_contents(
            $config['log_path'],
            date('Y-m-d H:i:s') . " 🔍 Respuesta cruda: {$resultado['respuesta']}\n",
            FILE_APPEND
        ); // Registra la respuesta completa (útil para depurar)
    }
}
