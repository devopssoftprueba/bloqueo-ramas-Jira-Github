const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Variables de entorno
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ORGANIZATION = 'devopssoftprueba';
const REPOSITORIOS = ['SitioUsuarioOnline', 'Backend'];
const ESTADO_BLOQUEO = 'PRUEBAS QA';
const ESTADO_DESBLOQUEO = 'DESARROLLO';

// Endpoint para recibir eventos de Jira
app.post('/webhook', async (req, res) => {
    console.log('✅ Webhook recibido desde Jira');

    try {
        // Log completo del cuerpo para inspección
        console.log('📦 Contenido recibido:', JSON.stringify(req.body, null, 2));

        const issue = req.body.issue;
        const changelog = req.body.changelog;

        if (!issue || !changelog) {
            console.warn('⚠️ Datos incompletos: falta "issue" o "changelog"');
            return res.status(400).send('Datos incompletos');
        }

        const issueKey = issue.key;
        const statusChange = changelog.items.find(item => item.field === 'status');

        if (!statusChange) {
            console.log(`ℹ️ No hubo cambio de estado en la historia ${issueKey}`);
            return res.status(200).send('No se requiere acción');
        }

        const nuevoEstado = statusChange.toString || statusChange.to;
        console.log(`🔄 Estado cambiado a: ${nuevoEstado}`);

        const branchName = `feature/${issueKey}`;

        for (const repo of REPOSITORIOS) {
            const url = `https://api.github.com/repos/${ORGANIZATION}/${repo}/branches/${branchName}/protection`;

            if (nuevoEstado.toLowerCase() === ESTADO_BLOQUEO.toLowerCase()) {
                console.log(`🔐 Protegiendo rama ${branchName} en ${repo} por estado "${nuevoEstado}"`);

                await axios.put(
                    url,
                    {
                        enforce_admins: true,
                        required_pull_request_reviews: {
                            required_approving_review_count: 1
                        },
                        required_status_checks: null,
                        restrictions: {
                            users: [],
                            teams: []
                        }
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${GITHUB_TOKEN}`,
                            Accept: 'application/vnd.github.v3+json'
                        }
                    }
                );

                console.log(`✅ Rama ${branchName} protegida en ${repo}`);
            }

            else if (nuevoEstado.toLowerCase() === ESTADO_DESBLOQUEO.toLowerCase()) {
                console.log(`🔓 Eliminando protección de rama ${branchName} en ${repo} por estado "${nuevoEstado}"`);

                await axios.delete(
                    url,
                    {
                        headers: {
                            Authorization: `Bearer ${GITHUB_TOKEN}`,
                            Accept: 'application/vnd.github.v3+json'
                        }
                    }
                );

                console.log(`✅ Protección eliminada para rama ${branchName} en ${repo}`);
            }

            else {
                console.log(`⏭️ Estado "${nuevoEstado}" no requiere acción en ${repo}`);
            }
        }

        res.status(200).send('Acción realizada correctamente según el estado');
    } catch (error) {
        const errMsg = error.response?.data || error.message || error;
        console.error('❌ Error procesando el webhook:', errMsg);
        res.status(500).send('Error procesando protección de rama');
    }
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
