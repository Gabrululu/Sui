# SuiStamp

> **Punch card on-chain**: crea una **Card**, suma **stamps** (sellos) y, al completar el objetivo, **canjea** por una **Badge** (prueba de logro). Todo como **objetos Sui**, con ownership nativo, versiones y transferencias seguras. Vertical slice listo para demo/defensa y go-to-market con bajo costo operativo.

---

## TL;DR

* Backend en **Move** (objetos `Card` y `Badge`).
* Frontend en **React** + **Sui dApp Kit**.
* Funciones: `create`, `punch`, `redeem`, `gift`.
* Testeado en **Testnet**; preparado y publicado en **Mainnet**.
* UX simple y clara.

---

## 🧠 ¿Qué es SuiStamp?

Un **punch card** on-chain: el usuario **crea** una `Card`, le va sumando **stamps** (sellos) y, al completar el objetivo, **canjea** la Card y recibe una **Badge** (prueba de logro).

---

## 🔧 ¿Cómo funciona?

### Backend (Move)

* `Card { id: UID, stamps: u8 }` → objeto con `key`; vive en la cuenta del owner.
* `Badge { id: UID }` → objeto que se mintea al canje (redención).

**Funciones clave:**

* `create(ctx)` → crea y transfiere una `Card` nueva al remitente.
* `punch(&mut Card)` → incrementa `stamps` (p. ej., hasta 5).
* `redeem(&mut Card, ctx)` → valida objetivo, **acuña** `Badge` y **resetea** la `Card`.
* `gift(Card, to: address)` → transfiere la `Card` a otra cuenta.

### On-chain (Sui)

* Cada `Card` y `Badge` es un **Object** con: `type`, `owner`, `version`, `digest`.
* La **propiedad** es nativa de Sui: solo el **owner** puede mutar/transferir.
* Cada operación es una **transacción** con **gas mínimo**.

### Frontend (React + dApp Kit)

* Conectas wallet (`ConnectButton`), pegas tu **PackageID** y disparas acciones:

  * `Create Card` → `Transaction.moveCall` a `suistamp::create`.
  * `Punch / Redeem / Gift` → `moveCall` a las funciones respectivas.
* Tras firmar, el front lee la `Card` con `getObject()` y muestra:

  * `stamps` actuales y `owner`.
* Para extraer el **Card ID** creado, el front toma el **digest** y filtra `objectChanges` por tipo `created` con `…endsWith("suistamp::Card")`.

---

## 💼 Utilidades

* **Fidelización**: cafés/tiendas/eventos → 1 sello por compra/visita; al quinto, **Badge** con perks (descuentos, VIP).
* **Educación & workshops**: asistencia por sesión; al completar, **Badge** “completado”.
* **Comunidades/DAO**: quests/retos; **Badge** como prueba de engagement.
* **Conferencias/meetups**: check-in a charlas/stands; canje final tipo **POAP**.
* **Marketing**: “colecciona 5 sellos” con marca; **Badge** como ticket a sorteos/beneficios.

> **Valor corporativo**: crea/usa/gestiona activos digitales con reglas simples, 100% auditable, UX amigable y costos ínfimos.

---

## 🧪 Flujo de usuario

1. **Crear**: Con wallet conectada y `PackageID` cargado → **Create Card**.
   *Resultado:* nueva `Card` (`stamps = 0`) en tu cuenta.
2. **Acumular**: Cada acción deseada → **Punch +1**.
   *Resultado:* `stamps` sube hasta el objetivo (p. ej., 5).
3. **Canjear**: **Redeem**.
   *Resultado:* recibes una **Badge** y la `Card` vuelve a `stamps = 0`.
4. **Transferir (opcional)**: **Gift** a otra `address`.
   *Resultado:* cambia el **owner** de la `Card`.

---

## 🚀 Quickstart

### Requisitos

* Node 18+
* Sui CLI instalado y configurado
* Una wallet Sui (Slush)

### Backend (Move)

```bash
# 1) Selecciona red
sui client switch --env testnet     # o --env mainnet

# 2) Build & publish
sui move build
sui client publish

# 3) Copia tu PackageID (del output o via UpgradeCap)
#    a) del publish (objectChanges → type=published → packageId)
#    b) por UpgradeCap (requiere jq):
UPG=$(sui client objects --json | jq -r '.data[] | select(.type=="0x2::package::UpgradeCap") | .objectId')
sui client object $UPG --json | jq -r '.data.content.fields.package'

#    b') sin jq (lee manualmente):
sui client objects
# -> copia el objectId del UpgradeCap y luego:
sui client object <UPGRADE_CAP_ID>
# -> busca el campo "package"
```

### Frontend (React)

```bash
# En suistamp-ui
npm i
npm run dev
```

**Usar la dApp**

1. Conecta tu wallet y alinea la red (Testnet/Mainnet).
2. Pega tu `PackageID`.
3. `Create Card` → `Punch` → `Redeem` → `Gift`.
4. `Fetch Card` muestra `stamps` y `owner`.

---

## 🗺️ Roadmap

* **AdminCap / MerchantCap**: solo direcciones autorizadas pueden `punch` (evita auto-farm).
* **Configurables**: `target_stamps` por `Card` o por “campaña”.
* **Eventos on-chain**: `event::emit` en `punch`/`redeem` para analítica.
* **Displays**: `sui::display` y metadata para que wallets muestren bonito la **Badge**.
* **Explorer links**: en la UI, linkear cada `digest` a suiexplorer para trazabilidad.
* **Tests Move**: unit tests de límites (overflow, doble redención, ownership).
* **Move Registry**: publicar alias legible (polish final).

---
## 🧪 Proof

https://suistamp.vercel.app/
---

**Built with ❤️ on Sui.** 

*Menos slides, más commits.*
