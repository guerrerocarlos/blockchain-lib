const fs = require("fs");
const crypto = require("crypto");
const { Crypto } = require("@peculiar/webcrypto");
const axios = require("axios").default;

const cryptosubtle = new Crypto();
const subtle = cryptosubtle.subtle;
let NODE = process.env.BLOCKCHAIN_ENDPOINT;

async function fetch(params) {
  return (await axios(params)).data;
}

function atob(str) {
  return Buffer.from(str, "base64").toString("binary");
}

function removeLines(str) {
  return str.replace("\n", "");
}

function base64ToArrayBuffer(b64) {
  var byteString = atob(b64);
  var byteArray = new Uint8Array(byteString.length);
  for (var i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  return byteArray;
}

function pemToArrayBufferPrivate(pem) {
  var b64Lines = removeLines(pem);
  var b64Prefix = b64Lines.replace("-----BEGIN RSA PRIVATE KEY-----", "");
  var b64Final = b64Prefix.replace("-----END RSA PRIVATE KEY-----", "");

  return base64ToArrayBuffer(b64Final);
}

async function getPrivateKey(pathToPrivateKey) {
  let privateKeyFile;
  try {
    privateKeyFile = fs.readFileSync(pathToPrivateKey).toString();
  } catch (err) {
    throw Error("Private key " + pathToPrivateKey + " was not found.");
  }

  return subtle.importKey(
    "pkcs8",
    pemToArrayBufferPrivate(privateKeyFile),
    {
      name: "RSA-PSS",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign"]
  );
}

async function sign(WHO, blockData, params, pathToPrivKey) {
  let blockToSign = {
    prevHash: params.prevHash,
    height: params.height,
    version: 2,
    data: blockData,
    timestamp: new Date().getTime(),
    scope: params.scope,
    by: WHO
  };

  let signature0 = await subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    await getPrivateKey(pathToPrivKey),
    Buffer.from(JSON.stringify(blockToSign, null, 2))
  );

  let signature64 = Buffer.from(signature0).toString("base64");

  blockToSign.signature = signature64;

  return blockToSign;
}

function generateHash(blockToSign) {
  var hash = crypto.createHash("sha256");
  const data = hash.update(JSON.stringify(blockToSign));
  return data.digest("hex");
}

async function clientSign(who, scope, blockContent, pathToPrivKey) {

  let { head, height } = await fetch(NODE + `/_head/${scope || who}`);

  if (height === undefined) {
    height = 0;
  }

  const block = await sign(
    who,
    blockContent,
    {
      height: parseInt(height) + 1,
      prevHash: head ?? "",
      scope: scope || who,
      encrypt: false,
    },
    pathToPrivKey
  );

  block.hash = generateHash(block);

  return block;
}

async function submitBlock(block) {
  let result = await axios.post(`${NODE}/newBlock`, block);
  return result.data;
}

function sleep(seconds) {
  return new Promise((success) => {
    setTimeout(success, seconds * 1000);
  });
}

async function confirmBlock(hash, i = 0) {
  let result;
  // let headResult = await axios(`${NODE}/_head/root`);
  result = await axios(`${NODE}/_block/${hash}`);
  if (result.data.error === "notFound" && i < 10) {
    await sleep(i);
    return confirmBlock(hash, i + 1);
  } else {
    return result.data;
  }
}

module.exports = { clientSign, submitBlock, confirmBlock };

if (require.main === module) {
  async function main() {
    let pathToKey = "./KEY.priv.key";
    let blockContent = "TEST FROM BACKEND";

    let signedBlock = await clientSign(
      "NOTARIO", // ENTITY
      "NOTARIO", // SCOPE
      blockContent, // BLOCK CONTENT
      pathToKey // PATH TO LOCAL KEY
    );
    let submitResult = await submitBlock(signedBlock);
    console.log("submitResult", submitResult);
    console.log(await confirmBlock(signedBlock.hash));
  }
  main();
}
