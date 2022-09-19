## Blockchain-lib

Define the blockchain endpoint to use as an ENV variable:

```
export BLOCKCHAIN_ENDPOINT=https://node.blockchain-service.com
````

### API

Example usage:

```js
  const pathToKey = "./KEY.priv.key";
  const blockContent = "TEST FROM BACKEND";

  const signedBlock = await clientSign(
    "NOTARIO", // ENTITY
    "NOTARIO", // SCOPE
    blockContent, // BLOCK CONTENT
    pathToKey // PATH TO LOCAL KEY
  );

  const submitResult = await submitBlock(signedBlock);
  console.log("submitResult", submitResult);
  console.log(await confirmBlock(signedBlock.hash));
```

Example result:

```
submitResult { verified: true, queued: true }
{
  prevHash: '12512a748535f9b28b727570d9cb6b',
  height: 15,
  version: 1,
  data: 'TEST FROM BACKEND',
  timestamp: 16847615,
  scope: 'NOTARIO',
  signature: 'fR7loT8CLTOuf/KxvEeCaRGurqRATMtiPJSZ8q2IQ==',
  by: 'NOTARIO',
  rootPrevHash: '12512a748535f9b286de62cc5418b79cb6b',
  rootHeight: 454,
  hash: '875457b166809e2a64e1abc74568fa820ef3'
}
```
