import fs from 'fs';

async function run() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  const data = await res.json();
  const models = data.data;
  
  const relevant = models.filter((m: any) => 
    m.id.includes('gemini') || 
    m.id.includes('gpt') || 
    m.id.includes('claude') || 
    m.id.includes('deepseek')
  ).map((m: any) => `${m.id} - ${m.name}`);
  
  fs.writeFileSync('models.txt', relevant.join('\n'));
}

run();
