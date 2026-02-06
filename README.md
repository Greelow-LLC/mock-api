# Mock API

API REST simple para el ejercicio de frontend. Usa SQLite y Express.

## Instalacion

```bash
cd mock-api
npm install
```

## Seed (crear tablas y datos iniciales)

```bash
npm run seed
```

Esto crea el archivo `data.db` con:
- 2 usuarios de prueba
- 5 items de ejemplo
- 5 ratings de ejemplo

**Credenciales de prueba:**
- Email: `demo@example.com`
- Password: `demo123`

## Levantar el servidor

```bash
npm run dev
```

El servidor corre en `http://localhost:3000`.

---

## Endpoints

### Auth

#### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "demo123"}'
```

Response:
```json
{
  "token": "fake-token-user-1",
  "user": { "id": "user-1", "email": "demo@example.com", "name": "Usuario Demo" }
}
```

#### Get current user
```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer fake-token-user-1"
```

---

### Items

#### List items
```bash
curl http://localhost:3000/items \
  -H "Authorization: Bearer fake-token-user-1"
```

#### List items with search
```bash
curl "http://localhost:3000/items?search=ejemplo" \
  -H "Authorization: Bearer fake-token-user-1"
```

#### List items by category
```bash
curl "http://localhost:3000/items?category=categoria-a" \
  -H "Authorization: Bearer fake-token-user-1"
```

#### Get item by ID (includes ratings)
```bash
curl http://localhost:3000/items/item-1 \
  -H "Authorization: Bearer fake-token-user-1"
```

#### Create item
```bash
curl -X POST http://localhost:3000/items \
  -H "Authorization: Bearer fake-token-user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mi nuevo item",
    "description": "Una descripcion opcional",
    "imageUrl": "https://picsum.photos/300/200",
    "category": "mi-categoria",
    "year": 2024
  }'
```

#### Update item
```bash
curl -X PUT http://localhost:3000/items/item-1 \
  -H "Authorization: Bearer fake-token-user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Item actualizado",
    "description": "Nueva descripcion",
    "category": "categoria-a",
    "year": 2024
  }'
```

#### Delete item
```bash
curl -X DELETE http://localhost:3000/items/item-1 \
  -H "Authorization: Bearer fake-token-user-1"
```

---

### Ratings

#### List ratings for an item
```bash
curl http://localhost:3000/items/item-1/ratings \
  -H "Authorization: Bearer fake-token-user-1"
```

#### Create rating
```bash
curl -X POST http://localhost:3000/items/item-1/ratings \
  -H "Authorization: Bearer fake-token-user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 5,
    "comment": "Excelente!"
  }'
```

**Nota:** `score` debe ser un numero del 1 al 5.

#### Delete rating (solo el autor puede borrarla)
```bash
curl -X DELETE http://localhost:3000/ratings/rating-1 \
  -H "Authorization: Bearer fake-token-user-1"
```

---

## Validaciones

La API valida los campos y devuelve `400 Bad Request` si algo esta mal:

```json
{
  "errors": [
    { "field": "name", "message": "name must be at least 2 characters" },
    { "field": "score", "message": "score must be at least 1" }
  ]
}
```

### Reglas de validacion

| Campo | Tipo | Requerido | Min | Max |
|-------|------|-----------|-----|-----|
| `name` | string | si | 2 | 200 |
| `description` | string | no | - | 2000 |
| `imageUrl` | string | no | - | 500 |
| `category` | string | no | - | 100 |
| `year` | number | no | 1900 | 2100 |
| `score` | number | si | 1 | 5 |
| `comment` | string | no | - | 1000 |
| `email` | string (email) | si | - | 255 |
| `password` | string | si | 1 | - |

---

## Errores comunes

| Status | Significado |
|--------|-------------|
| 400 | Validacion fallida (ver `errors` en response) |
| 401 | No autenticado o token invalido |
| 403 | No autorizado (ej: borrar rating de otro usuario) |
| 404 | Recurso no encontrado |
