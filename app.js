const express = require('express'); // Importa el framework Express para crear el servidor web
const axios = require('axios'); // Importa Axios para hacer peticiones HTTP a la API de GitHub
const app = express(); // Crea una instancia de la aplicación Express

app.use(express.json()); // Middleware que permite a Express interpretar los cuerpos JSON de las solicitudes

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Toma el token de GitHub desde las variables de entorno
const ORGANIZATION = 'devopssoftprueba'; // Nombre de la organización
const REPOSITORIOS = ['SitioUsuarioOnline', 'Backend']; // Lista de repositorios donde se aplicará protección o desbloqueo de ramas

const ESTADO_BLOQUEO = 'PRUEBAS QA'; // Estado de Jira que activará la protección de la rama
const ESTADO_DESBLOQUEO = 'EN DESARROLLO'; // Estado de Jira que eliminará la protección de la rama

// Define el endpoint POST que recibe eventos webhook desde Jira
app.post('/webhook', async (req, res) => {
    console.log('✅ Webhook recibido desde Jira'); // Confirma que se recibió una solicitud

    try {
        // Muestra el cuerpo del webhook recibido en la consola, en formato legible
        console.log('📦 Contenido recibido:', JSON.stringify(req.body, null, 2));

        const issue = req.body.issue; // Extrae la información de la historia de Jira
        const changelog = req.body.changelog; // Extrae los cambios realizados (como cambio de estado)

        if (!issue || !changelog) { //si no extrae información de la historia de jira y tampoco extrae los cambios realizados
            console.warn('⚠️ Datos incompletos: falta "issue" o "changelog"'); // Mensaje si faltan datos importantes
            return res.status(400).send('Datos incompletos'); // Respuesta HTTP de error por solicitud mal formada
        }

        const issueKey = issue.key; // Obtiene el identificador de la historia, ej: VSFT-101
        const statusChange = changelog.items.find(item => item.field === 'status'); // Busca el cambio de estado en el changelog

        if (!statusChange) {//si no extrajo un cambio de estado
            console.log(`ℹ️ No hubo cambio de estado en la historia ${issueKey}`); // No hay cambio de estado, no se hace nada
            return res.status(200).send('No se requiere acción'); // Responde OK sin realizar cambios
        }

        // Obtiene el nuevo estado como string legible (a veces puede venir como `.to` o `.toString`)
        const nuevoEstado = statusChange.toString || statusChange.to; // Asigna a "nuevoEstado" el nombre legible del nuevo estado si está disponible ("toString"); si no, usa el ID interno del estado ("to")
        console.log(`🔄 Estado cambiado a: ${nuevoEstado}`); // Muestra el nuevo estado en la consola

        // Itera por cada repositorio listado
        for (const repo of REPOSITORIOS) {
            const branchName = `feature/${issueKey}`; // Construye el nombre de la rama: ej. "feature/DEV-13"
            const url = `https://api.github.com/repos/${ORGANIZATION}/${repo}/branches/${branchName}/protection`; // URL para proteger/desproteger la rama en GitHub

            // Si el nuevo estado es igual a "PRUEBAS QA", se protege la rama
            if (nuevoEstado.toLowerCase() === ESTADO_BLOQUEO.toLowerCase()) {
                console.log(`🔐 Protegiendo rama ${branchName} en ${repo}`); // Muestra que está aplicando protección

                await axios.put( // Envía una petición PUT a la API de GitHub para activar la protección en una rama específica
                    url, // URL del endpoint GitHub
                    {
                        enforce_admins: true, // Obliga también a los admins a cumplir las reglas de protección
                        required_pull_request_reviews: {
                            required_approving_review_count: 1 // Requiere al menos una aprobación para hacer merge
                        },
                        required_status_checks: null, // No se requieren validaciones de CI/CD
                        restrictions: {
                            users: [], // No se limita a usuarios específicos
                            teams: []  // Ni a equipos específicos
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${GITHUB_TOKEN}`, // Autenticación con token
                            Accept: 'application/vnd.github.v3+json' // Header para indicar que se usa la API v3 de GitHub
                        }
                    }
                );
                console.log(`✅ Rama ${branchName} protegida en ${repo}`); // Confirma que se aplicó la protección
            } 
            // Si el nuevo estado es "EN DESARROLLO", se elimina la protección
            else if (nuevoEstado.toLowerCase() === ESTADO_DESBLOQUEO.toLowerCase()) {
                console.log(`🔓 Quitando protección a rama ${branchName} en ${repo}`); // Indica que se va a desbloquear la rama

                await axios.delete(url, {
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`, // Token de acceso
                        Accept: 'application/vnd.github.v3+json' // API v3 de GitHub
                    }
                });
                console.log(`✅ Rama ${branchName} desbloqueada en ${repo}`); // Confirma que la rama fue desbloqueada
            } 
            // Si el estado no es relevante, se omite la acción
            else {
                console.log(`⏭️ Estado "${nuevoEstado}" no requiere acción en ${repo}`); // Estado no aplicable, no hace nada
            }
        }

        res.status(200).send('Acción completada'); // Todo fue exitoso
    } catch (error) {
        const errMsg = error.response?.data || error.message || error; // Extrae el mensaje de error más útil
        console.error('❌ Error procesando el webhook:', errMsg); // Muestra el error en la consola
        res.status(500).send('Error procesando ramas'); // Devuelve error 500 si algo falló
    }
});

const PORT = process.env.PORT || 3000; // Toma el puerto de entorno o usa 3000 por defecto
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`); // Confirma que el servidor Express está corriendo
});
