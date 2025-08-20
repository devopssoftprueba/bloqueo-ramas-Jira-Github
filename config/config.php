<?php
//archivo para configurar el funcionamiento del bloqueo de ramas en este archivo se configuran tokens de github, repositorios que se bloquearan
//junto con los estados que bloquearan las ramas
return [
    'github_token' => getenv('GITHUB_TOKEN') ,

    'repositorios' => [
        'devopssoftprueba/Backend',
        'devopssoftprueba/SitioUsuarioOnline'
    ],
    'estados_bloqueo' => [ // Lista de estados que activan el bloqueo
        'PRUEBAS QA',
        'PENDIENTE CRED PROD',
        'PASAR A PRODUCCIÓN',
        'ENTREGA AL NEGOCIO',
        'PRUEBAS EN PRODUCCIÓN',
        'FINALIZADA',
    ],
    'log_path' => __DIR__ . '/../logs/webhook.log', //enviar los logs al archivo correspondiente
];
