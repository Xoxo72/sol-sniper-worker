const WATCHLIST = new Set([
  "j1oeQoPeuEDmjvyMwBmCWexzCQup77kbKKxV59CnYbd",
  "j1oAbxxiDUWvoHxEDhWE7THLjEkDQW2cSHYn2vttxTF",
  "suqh5sHtr8HyJ7q8scBimULPkPpA557prMG47xCHQfK",
  "j1opmdubY84LUeidrPCsSGskTCYmeJVzds1UWm6nngb",
  "DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj",
  "73LnJ7G9ffBDjEBGgJDdgvLUhD5APLonKrNiHsKDCw5B",
  "HdxkiXqeN6qpK2YbG51W23QSWj3Yygc1eEk2zwmKJExp",
  "5Dqsy7HaAfBwCmc21cBZfdQEjt39kSnthb28BnfkEN8e",
  "ZG98FUCjb8mJ824Gbs6RsgVmr1FhXb2oNiJHa2dwmPd",
  "o7RY6P2vQMuGSu1TrLM81weuzgDjaCRTXYRaXJwWcvc",
  "qifZKL6UBTJgig5hAm5kUgX4c2ckD8r9Qkkf9xUeRBd",
  "9dgP6ciSqytSJrcJoqEk5RM2kzMRZeJNLkchhm1u7eaf",
  "6bN5ncxf4Qg3KGacRTTSKkWRu3Y9Uv2GbMu18GdwHajS",
  "ETR2nhTSnq5uBgn8u3LPfsXkUJcQddsJnUYvHSafEFMG"
]);

export default {
  async fetch(req, env, ctx) {
    const body = await req.json();
    const acct = body.account;
    if (!WATCHLIST.has(acct)) return new Response("skip", {status:200});

    const logs = body.transaction?.meta?.logMessages || [];
    const mintLine = logs.find(l => l.includes("InitializeMint"));
    if (!mintLine) return new Response("no mint", {status:200});
    const mint = mintLine.split(" ").pop();

    const [supply, price] = await Promise.all([
      fetch(env.RPC_URL, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getTokenSupply",params:[mint]})
      }).then(r=>r.json()).then(j=>Number(j.result.value.uiAmount)),
      fetch(`https://public-api.birdeye.so/defi/price?address=${mint}`)
        .then(r=>r.json()).then(j=>Number(j.data.value)||0)
    ]);
    if (!price || supply*price > 5_000) return new Response("mc>5k",{status:200});

    ctx.waitUntil(fetch(env.BOT_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({mint, supply, price})
    }));
    return new Response("sent",{status:200});
  }
}
