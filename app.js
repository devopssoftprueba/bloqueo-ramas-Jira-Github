// app.js

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ORGANIZATION = 'devopssoftprueba'; // Cambia esto por tu usuario u organización
const REPOSITORIOS = ['SitioUsuarioOnline', 'Backend']; // Cambia por los nombres REALES

const ESTADO_OBJETIVO = 'PASAR A PRODUCCIÓN'; // Estado en Jira que activará el bloqueo

// Endpoint para recibir eventos de Jira
app.post('/webhook', async (req, res) => {
    try {
        const issue = req.body.issue;
        const changelog = req.body.changelog;

        if (!issue || !changelog) {
            return res.status(400).send('Datos incompletos');
        }

        const issueKey = issue.key;
        const statusChange = changelog.items.find(i => i.field === 'status');

        if (!statusChange || statusChange.toString.toLowerCase() !== ESTADO_OBJETIVO.toLowerCase()) {
            return res.status(200).send('No se requiere acción');
        }

        for (const repo of REPOSITORIOS) {
            const branchName = `feature/${issueKey}`;
            const url = `https://api.github.com/repos/${ORGANIZATION}/${repo}/branches/${branchName}/protection`;

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
        }

        res.status(200).send('Ramas protegidas correctamente');
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).send('Error protegiendo ramas');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Escuchando en el puerto ${PORT}`);
});
 
