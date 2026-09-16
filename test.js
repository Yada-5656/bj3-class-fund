const STORE_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a0a664936f137c';
fetch(STORE_URL).then(res => res.json()).then(data => console.log(JSON.stringify(data, null, 2)));
