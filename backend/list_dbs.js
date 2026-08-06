const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const serviceAccount = path.join(__dirname, 'secrets', 'diamante-f70f4-2dfe26b2bdb7.json');

async function main() {
  const auth = new GoogleAuth({
    keyFile: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases`;
  const res = await client.request({ url });
  console.log('Databases:', JSON.stringify(res.data, null, 2));
}

main().catch(console.error);
