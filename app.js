// app.js

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Variables de entorno
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ORGANIZATION = 'devopssoftprueba';
const REPOSITORIOS = ['SitioUsuarioOnline', 'Backend'];
const ESTADO_OBJETIVO = 'PASAR A PRODUCCIÓN';

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

        const nuevoEstado = statusChange.toString || statusChange.to; // Fallback
        console.log(`🔄 Estado cambiado a: ${nuevoEstado}`);

        if (!nuevoEstado || nuevoEstado.toLowerCase() !== ESTADO_OBJETIVO.toLowerCase()) {
            console.log(`⏭️ Estado no coincide con "${ESTADO_OBJETIVO}"`);
            return res.status(200).send('No se requiere acción');
        }

        for (const repo of REPOSITORIOS) {
            const branchName = `feature/${issueKey}`;
            const url = `https://api.github.com/repos/${ORGANIZATION}/${repo}/branches/${branchName}/protection`;

            console.log(`🔐 Intentando proteger rama: ${branchName} en repositorio: ${repo}`);

            await axios.put(
                url,
                {
                    required_status_checks: null,
                    enforce_admins: false,
                    required_pull_request_reviews: null,
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

            console.log(`✅ Rama ${branchName} protegida en repositorio: ${repo}`);
        }

        res.status(200).send('Ramas protegidas correctamente');
    } catch (error) {
        const errMsg = error.response?.data || error.message || error;
        console.error('❌ Error procesando el webhook:', errMsg);
        res.status(500).send('Error protegiendo ramas');
    }
});

// Puerto del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
});
