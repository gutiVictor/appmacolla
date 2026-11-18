# Guía Completa: Tu App en Netlify + Supabase (Sin Google Apps Script)

Esta solución te da una aplicación moderna, ultra rápida (carga en milisegundos), con usuarios, roles y control de inventario, **sin necesidad de usar Google Apps Script**, pero manteniendo un editor idéntico a Excel para ver y editar tus datos.

---

## ¿Qué archivos tienes listos en tu carpeta?

En tu carpeta `g:\Escritorio\app\` tienes únicamente lo necesario:
1. **`index.html`:** La aplicación web completa con inicio de sesión, roles (Admin y Cajero), dashboard, alquileres, taquilla, edición de productos `✏️` y facturación.
2. **`supabase_setup.sql`:** El script que crea la base de datos con tus **18 productos y 43 movimientos reales** ya incluidos.
3. **`_redirects`:** Archivo de configuración para Netlify.
4. **`Inventario Juriepe.xlsx`:** Tu archivo de Excel original (conservado como respaldo).

---

## PASO 1: Crear tu cuenta gratuita en Supabase (2 minutos)

1. Entra a: **[https://supabase.com](https://supabase.com)**
2. Haz clic en el botón verde **"Start your project"** (puedes registrarte gratis con tu correo o con tu cuenta de Google o GitHub).
3. Haz clic en **"New Project"** (Nuevo Proyecto):
   * **Name:** `macolla-juriepe` (o el nombre que prefieras).
   * **Database Password:** Escribe una contraseña que recuerdes.
   * **Region:** Elige la más cercana (ejemplo: *South America (São Paulo)* o *East US*).
   * **Plan:** Free Plan ($0 / mes).
4. Haz clic en **"Create new project"** y espera 1 minuto a que se prepare tu base de datos.

---

## PASO 2: Cargar tu Base de Datos y tus Datos de Excel (1 Clic)

1. En el menú lateral izquierdo de Supabase, haz clic en el icono **SQL Editor** (parece una consola o terminal `>_`).
2. Haz clic en **"New query"** (Nueva consulta).
3. Abre en tu computador el archivo:
   * **[supabase_setup.sql](file:///g:/Escritorio/app/supabase_setup.sql)**
4. Copia todo su contenido, pégalo en la pantalla de Supabase y haz clic en el botón verde **"Run"** (o presiona `Ctrl + Enter`).
5. ¡Listo! Verás el mensaje *"Success. No rows returned"*.
   * Ya quedaron creadas las tablas: `usuarios`, `productos`, `movimientos` y `facturas`.
   * **Tus 18 productos y 43 movimientos históricos de tu Excel quedaron cargados automáticamente.**

---

## PASO 3: Copiar tus Claves de Conexión de Supabase

1. En el menú lateral izquierdo de Supabase, haz clic abajo en la tuerca **Project Settings** (Configuración del proyecto).
2. En el menú secundario, haz clic en **API** (o *Data API*).
3. Verás dos datos importantes:
   * **Project URL:** Algo como `https://abcdefghijklm.supabase.co`
   * **Project API Keys > anon public:** Una clave larga de letras y números que empieza por `eyJ...`
4. Copia ambos valores (o mantén esa pestaña abierta).

---

## PASO 4: Publicar la App en Netlify (Gratis y en 30 segundos)

1. Abre en tu navegador: **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. Arrastra directamente la carpeta **`app`** de tu Escritorio (`g:\Escritorio\app`) y suéltala en el círculo punteado.
3. En 5 segundos Netlify te dará el enlace de tu app (ejemplo: `https://macolla-juriepe.netlify.app`).

---

## PASO 5: Conectar y Comenzar a Usar

1. Abre el enlace que te dio Netlify en tu computador o celular.
2. Toca el botón **⚙️ Configurar claves de Supabase** (o la barra amarilla superior).
3. Pega tu **Project URL** y tu **API Key (anon public)** que copiaste en el Paso 3.
4. Toca en **Guardar Conexión**.
5. Inicia sesión:
   * **Como Administrador:** Usuario: `admin` | Contraseña: `admin123`
   * **Como Cajero:** Usuario: `caja` | Contraseña: `1234`

¡Listo! Ya tienes tu sistema operando en la nube con la máxima velocidad posible.

---

## ¿Cómo ver y editar tus datos estilo Excel en Supabase?

Cuando quieras ver tus datos, cambiar precios o descargar todo a Excel:

1. Entra a tu proyecto en **[supabase.com](https://supabase.com)**.
2. En el menú izquierdo, haz clic en **Table Editor** (icono de tabla de Excel).
3. Selecciona la tabla que quieras ver:
   * **`productos`:** Ves todos tus artículos. Puedes hacer doble clic en cualquier celda para cambiar el precio, nombre o stock, igual que en Excel.
   * **`movimientos`:** Ves el historial completo de ventas, alquileres y taquilla.
   * **`usuarios`:** Puedes cambiar contraseñas, crear nuevos cajeros o suspenderlos.
4. **Para descargar a Excel:** En la esquina superior derecha de la tabla, haz clic en **Export data > Export to CSV**. Lo abres directamente en Microsoft Excel en tu computadora.
5. **Para subir desde Excel:** Haz clic en **Insert > Import data from CSV** y seleccionas tu archivo de Excel.
