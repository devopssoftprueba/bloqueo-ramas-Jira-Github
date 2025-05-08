<?php
// src/BloqueadorDeRamas.php

// Se define una clase llamada 'BloqueadorDeRamas'.
class BloqueadorDeRamas
{
    // Se definen las propiedades token: sería la autenticación de github y repositorio: serían los repositorios que se van a bloquear.
    private $token;
    private $repositorio;


    public function __construct($token, $repositorio) // Acepta dos parámetros: '$token' y '$repositorio', y los asigna a las propiedades de la clase.
    {
        $this->token = $token;  // Se guarda el valor del parámetro '$token' en la propiedad '$token' del objeto.
        $this->repositorio = $repositorio;  // Se guarda el valor del parámetro '$repositorio' en la propiedad '$repositorio' del objeto.
    }

    // Esta función 'bloquear' se llama cuando queremos bloquear una rama en el repositorio.
    // Recibe el nombre de la rama como parámetro.
    public function bloquear(string $rama): array
    {
        // Llama al metodo 'protegerRama' pasándole el nombre de la rama y el valor 'true', que significa que se quiere bloquear.
        return $this->protegerRama($rama, true);
    }

    // Esta función 'desbloquear' se llama cuando queremos desbloquear una rama en el repositorio.
    // Recibe el nombre de la rama como parámetro.
    public function desbloquear(string $rama): array
    {
        // Llama al metodo 'protegerRama' pasándole el nombre de la rama y el valor 'false', que significa que se quiere desbloquear.
        return $this->protegerRama($rama, false);
    }

    // Metodo privado que maneja tanto el bloqueo como el desbloqueo de una rama.
    // Recibe dos parámetros: '$rama' (el nombre de la rama) y '$bloquear' (un valor booleano que indica si se bloquea o desbloquea).
    private function protegerRama(string $rama, bool $bloquear): array
    {
        // Aquí se define la URL que se usará para la API de GitHub para proteger la rama.
        // La URL incluye el nombre del repositorio y la rama que queremos proteger.
        $url = "https://api.github.com/repos/$this->repositorio/branches/$rama/protection";

        // Si '$bloquear' es 'true', se crea un array con los datos necesarios para bloquear la rama.
        // Si '$bloquear' es 'false', se establece '$data' como 'null', lo que indicará que no hay protección (desbloquear).
        $data = $bloquear ? [
            'required_status_checks' => [
                'strict' => true,  // Se establece que se requiere un chequeo de estado estricto.
                'contexts' => []  // No se definen contextos específicos para el chequeo de estado.
            ],
            'enforce_admins' => true,  // Se requiere que los administradores también sigan las reglas de protección.
            'required_pull_request_reviews' => [
                'dismiss_stale_reviews' => true,  // Se requiere que las revisiones obsoletas sean descartadas.
                'require_code_owner_reviews' => true,  // Se requiere que el propietario del código revise.
                'required_approving_review_count' => 1  // Se requiere que haya al menos una revisión aprobatoria.
            ],
            'restrictions' => null,  // No hay restricciones específicas para las ramas.
        ] : null;  // Si no se bloquea, se devuelve 'null' porque no hay datos de protección.

        // Se definen los encabezados HTTP para la solicitud. Estos incluyen el token de autenticación, el tipo de contenido que aceptamos y el nombre de usuario de la aplicación.
        $headers = [
            "Authorization: Bearer $this->token",  // El token de GitHub para autenticación.
            'Accept: application/vnd.github+json',  // Especifica el tipo de respuesta que esperamos de GitHub.
            'User-Agent: bloqueo-webhook-jira'  // Un nombre de agente de usuario para identificar la aplicación que hace la solicitud.
        ];

        // Se inicializa una sesión CURL.
        $ch = curl_init($url);

        // Se configuran las opciones de cURL, como la URL, el tipo de solicitud (PUT para bloquear, DELETE para desbloquear) y los encabezados HTTP.
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,  // Indica que la respuesta debe ser devuelta como una cadena.
            CURLOPT_CUSTOMREQUEST => $bloquear ? 'PUT' : 'DELETE',  // Si '$bloquear' es 'true', se usa 'PUT' (para bloquear), de lo contrario 'DELETE' (para desbloquear).
            CURLOPT_HTTPHEADER => $headers,  // Se añaden los encabezados HTTP definidos anteriormente.
        ]);

        // Si '$bloquear' es 'true', se añade los datos de protección ('$data') a la solicitud cURL.
        if ($bloquear) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));  // Se convierte el array '$data' a formato JSON y se añade a la solicitud.
        }

        // Se ejecuta la solicitud cURL y se guarda la respuesta en '$respuesta'.
        $respuesta = curl_exec($ch);

        // Se obtiene el código de estado HTTP de la respuesta.
        $codigo = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        // Se cierra la sesión cURL.
        curl_close($ch);

        // Si la respuesta no es exitosa (200 para bloquear, 204 para desbloquear), se devuelve un error.
        if (($bloquear && $codigo != 200) || (!$bloquear && $codigo != 204)) {
            return [
                'codigo' => $codigo,  // El código de estado HTTP.
                'respuesta' => $respuesta,  // La respuesta de la API.
                'error' => 'Hubo un problema al ' . ($bloquear ? 'bloquear' : 'desbloquear') . ' la rama.'  // Mensaje de error.
            ];
        }

        // Si la solicitud fue exitosa, se devuelve un mensaje de éxito.
        return [
            'codigo' => $codigo,  // El código de estado HTTP.
            'respuesta' => $respuesta,  // La respuesta de la API.
            'mensaje' => 'Rama ' . ($bloquear ? 'bloqueada' : 'desbloqueada') . ' exitosamente'  // Mensaje de éxito indicando si fue bloqueada o desbloqueada.
        ];
    }
}
