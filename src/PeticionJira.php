<?php

/**
 * @category Jira
 * @package  WebhookProcessor
 * @author   Ronald
 * @version  1.0
 * @since    2025-04-21
 */

declare(strict_types=1);

class PeticionJira
{
    /**
     * Extrae datos clave desde el payload de Jira.
     *
     * @param array $json El array decodificado del payload JSON recibido desde Jira.
     *
     * @return array|null Retorna un array con la clave, estado y rama a bloquear. Null si faltan datos.
     */
    public static function extraerDatosDesdePayload(array $json): ?array
    {
        if (
            !isset($json['issue']['key']) ||
            !isset($json['issue']['fields']['status']['name']) ||
            !isset($json['issue']['fields']['summary'])
        ) {
            return null;
        }

        $clave = $json['issue']['key']; // Ej: DEV-13
        $estado = $json['issue']['fields']['status']['name']; //validar el campo name
        $titulo = strtolower($json['issue']['fields']['summary']); // Ej: "prueba QA"

        // Lógica simple: si el título contiene "bug", usar bugfix/, de lo contrario feature/
        $prefijo = str_contains($titulo, 'bug') ? 'bugfix/' : 'feature/';

        return [
            'clave'  => $clave,
            'estado' => $estado,
            'rama'   => $prefijo . $clave, // Ej: feature/DEV-13 o bugfix/DEV-13
        ];
    }
}
