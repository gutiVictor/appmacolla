// Configuración permanente de Supabase (Finca Juriepe)
    const DEFAULT_SB_URL = "https://khopqjwrhjcrjodfuimi.supabase.co";
    const DEFAULT_SB_KEY = "sb_publishable_EIiKkF27VodlWAZhs7ygoA_xm7Oz4Zm";

    let sbClient = null;
    let usuarioActual = null;
    let stockGlobal = [];
    let facturasItems = [];

    function obtenerSbConfig() {
      return {
        url: localStorage.getItem('juriepe_sb_url') || DEFAULT_SB_URL,
        key: localStorage.getItem('juriepe_sb_key') || DEFAULT_SB_KEY
      };
    }

    function limpiarUrlSupabase(rawUrl) {
      let u = (rawUrl || '').trim();
      u = u.replace(/\/rest\/v1\/?$/, '');
      u = u.replace(/\/+$/, '');
      return u;
    }

    function initSupabase() {
      const cfg = obtenerSbConfig();
      if (cfg.url && cfg.key && window.supabase) {
        const cleanUrl = limpiarUrlSupabase(cfg.url);
        sbClient = window.supabase.createClient(cleanUrl, cfg.key);
        document.getElementById('configWarningBanner').style.display = 'none';
        return true;
      } else {
        document.getElementById('configWarningBanner').style.display = 'flex';
        return false;
      }
    }

    function mostrarAlerta(mensaje, tipo = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast ${tipo}`;
      toast.innerHTML = `<span>${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : tipo === 'warning' ? '⚠️' : 'ℹ️'} ${mensaje}</span>`;
      container.appendChild(toast);
      setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
    }

    /* ==================== LOGIN Y ROLES ==================== */
    async function ejecutarLogin(event) {
      event.preventDefault();
      if (!initSupabase()) {
        abrirModalConfig();
        return mostrarAlerta('Primero debes configurar las claves de Supabase', 'warning');
      }

      const userInput = document.getElementById('loginUser').value.trim();
      const pass = document.getElementById('loginPass').value.trim();
      const btn = document.getElementById('btnLogin');
      btn.disabled = true; btn.textContent = 'Verificando...';

      try {
        // Buscamos sin distinguir mayúsculas/minúsculas en el usuario (ilike)
        const { data, error } = await sbClient
          .from('usuarios')
          .select('*')
          .ilike('usuario', userInput)
          .eq('password', pass)
          .eq('estado', 'ACTIVO')
          .maybeSingle();

        btn.disabled = false; btn.textContent = '🔑 Iniciar Sesión';

        if (error) throw error;
        if (!data) return mostrarAlerta('Usuario o contraseña incorrectos', 'error');

        usuarioActual = data;
        localStorage.setItem('juriepe_sb_user', JSON.stringify(usuarioActual));
        mostrarAlerta(`Bienvenido, ${usuarioActual.nombre}`, 'success');
        iniciarAppConUsuario();
      } catch (err) {
        btn.disabled = false; btn.textContent = '🔑 Iniciar Sesión';
        mostrarAlerta('Error de inicio de sesión: ' + err.message, 'error');
      }
    }

    function iniciarAppConUsuario() {
      if (!usuarioActual) return;
      document.getElementById('vistaLogin').style.display = 'none';
      document.getElementById('vistaApp').style.display = 'block';

      const badgeIcon = usuarioActual.rol === 'ADMIN' ? '👑' : '👤';
      document.getElementById('userPill').textContent = `${badgeIcon} ${usuarioActual.nombre} (${usuarioActual.rol})`;

      const elementosAdmin = document.querySelectorAll('.solo-admin');
      if (usuarioActual.rol === 'ADMIN') {
        elementosAdmin.forEach(el => el.style.display = '');
        showTab(null, 'dashboard');
      } else {
        elementosAdmin.forEach(el => el.style.display = 'none');
        showTab(null, 'alquileres');
      }
      cargarStockParaFactura();
    }

    function cerrarSesion() {
      if (confirm('¿Deseas cerrar tu sesión?')) {
        usuarioActual = null;
        localStorage.removeItem('juriepe_sb_user');
        document.getElementById('vistaApp').style.display = 'none';
        document.getElementById('vistaLogin').style.display = 'flex';
        document.getElementById('formLogin').reset();
      }
    }

    /* ==================== PESTAÑAS ==================== */
    function showTab(event, tabName) {
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

      const tabEl = document.getElementById(tabName);
      if (tabEl) tabEl.classList.add('active');
      if (event) event.currentTarget.classList.add('active');
      else {
        const btn = Array.from(document.querySelectorAll('.tab-button')).find(b => b.getAttribute('onclick')?.includes(tabName));
        if (btn) btn.classList.add('active');
      }

      if (tabName === 'dashboard' && usuarioActual?.rol === 'ADMIN') cargarDashboard();
      else if (tabName === 'alquileres') cargarAlquileres();
      else if (tabName === 'taquilla') cargarTaquilla();
      else if (tabName === 'inventario' && usuarioActual?.rol === 'ADMIN') cargarInventario();
    }

    /* ==================== DASHBOARD (ULTRA RÁPIDO) ==================== */
    async function cargarDashboard() {
      if (!initSupabase()) return;
      const desde = document.getElementById('dashDesde').value;
      const hasta = document.getElementById('dashHasta').value;

      try {
        const [{ data: movs, error: errM }, { data: prods, error: errP }] = await Promise.all([
          sbClient.from('movimientos').select('*').gte('fecha', desde).lte('fecha', hasta),
          sbClient.from('productos').select('*')
        ]);

        if (errM || errP) throw (errM || errP);

        const prodMap = {};
        (prods || []).forEach(p => { prodMap[p.codigo] = p; });

        let alquilerRecaudo = 0, alquilerCanoas = 0;
        let carrosRecaudo = 0, carrosCant = 0;
        let turistasRecaudo = 0, turistasCant = 0;
        let particularesRecaudo = 0, particularesCant = 0;
        let restauranteRecaudo = 0, restauranteCant = 0;
        let gananciaVentas = 0, valorTotalVentas = 0, unidadesVentas = 0;
        let canoasCount = {}, detalleComida = { "Desayuno": 0, "Almuerzo": 0, "Comida": 0 };
        let ventasPorProducto = {};

        (movs || []).forEach(m => {
          if (m.tipo === 'SALIDA') {
            const prod = prodMap[m.codigo] || {};
            const tipoP = prod.tipo || 'INVENTARIO';
            const nom = (prod.nombre || '').toLowerCase();

            if (tipoP === 'ALQUILER') {
              alquilerRecaudo += parseFloat(m.ganancia || 0);
              alquilerCanoas += parseFloat(m.cantidad || 0);
              canoasCount[prod.nombre] = (canoasCount[prod.nombre] || 0) + parseFloat(m.cantidad || 0);
            } else if (tipoP === 'SERVICIO') {
              if (nom.includes('particular')) {
                particularesRecaudo += parseFloat(m.ganancia || 0);
                particularesCant += parseFloat(m.cantidad || 0);
              } else if (nom.includes('carro')) {
                carrosRecaudo += parseFloat(m.ganancia || 0);
                carrosCant += parseFloat(m.cantidad || 0);
              } else if (nom.includes('turista')) {
                turistasRecaudo += parseFloat(m.ganancia || 0);
                turistasCant += parseFloat(m.cantidad || 0);
              } else if (nom.includes('desayuno') || nom.includes('almuerzo') || nom.includes('comida')) {
                restauranteRecaudo += parseFloat(m.ganancia || 0);
                restauranteCant += parseFloat(m.cantidad || 0);
                if (nom.includes('desayuno')) detalleComida['Desayuno'] += parseFloat(m.cantidad || 0);
                else if (nom.includes('almuerzo')) detalleComida['Almuerzo'] += parseFloat(m.cantidad || 0);
                else if (nom.includes('comida')) detalleComida['Comida'] += parseFloat(m.cantidad || 0);
              }
            } else if (tipoP === 'INVENTARIO') {
              gananciaVentas += parseFloat(m.ganancia || 0);
              const pv = parseFloat(m.precio_venta || prod.precio_venta || 0);
              valorTotalVentas += (parseFloat(m.cantidad || 0) * pv);
              unidadesVentas += parseFloat(m.cantidad || 0);
              ventasPorProducto[prod.nombre] = (ventasPorProducto[prod.nombre] || 0) + parseFloat(m.cantidad || 0);
            }
          }
        });

        // Top Canoa
        let topCanoa = { nombre: '-', cantidad: 0 };
        for (let c in canoasCount) {
          if (canoasCount[c] > topCanoa.cantidad) topCanoa = { nombre: c, cantidad: canoasCount[c] };
        }

        const ingresoTotal = alquilerRecaudo + carrosRecaudo + turistasRecaudo + particularesRecaudo + restauranteRecaudo + valorTotalVentas;

        document.getElementById('statIngresoTotal').textContent = `$${ingresoTotal.toLocaleString('es-CO')}`;
        document.getElementById('statAlquilerRecaudo').textContent = `$${alquilerRecaudo.toLocaleString('es-CO')}`;
        document.getElementById('statAlquilerCant').textContent = `${alquilerCanoas} canoas alquiladas`;
        document.getElementById('statTopCanoa').textContent = `${topCanoa.nombre} (${topCanoa.cantidad} veces)`;

        document.getElementById('statCarrosRecaudo').textContent = `$${carrosRecaudo.toLocaleString('es-CO')}`;
        document.getElementById('statCarrosCant').textContent = `${carrosCant} carros`;

        document.getElementById('statTuristasRecaudo').textContent = `$${turistasRecaudo.toLocaleString('es-CO')}`;
        document.getElementById('statTuristasCant').textContent = `${turistasCant} turistas`;

        document.getElementById('statParticularesRecaudo').textContent = `$${particularesRecaudo.toLocaleString('es-CO')}`;
        document.getElementById('statParticularesCant').textContent = `${particularesCant} particulares`;

        document.getElementById('statRestauranteRecaudo').textContent = `$${restauranteRecaudo.toLocaleString('es-CO')}`;
        document.getElementById('statRestauranteCant').textContent = `${restauranteCant} platos`;
        const desgloseRest = Object.keys(detalleComida).filter(k => detalleComida[k] > 0).map(k => `${k}: ${detalleComida[k]}`).join(', ');
        document.getElementById('statRestauranteDesglose').textContent = desgloseRest || 'Sin registros';

        document.getElementById('statValorVenta').textContent = `$${valorTotalVentas.toLocaleString('es-CO')}`;
        const desgloseV = Object.keys(ventasPorProducto).map(k => `${k}: ${ventasPorProducto[k]}`).join(', ');
        document.getElementById('statDesgloseVentas').innerHTML = `${unidadesVentas} unidades<br><span style="font-size:0.65rem;">${desgloseV || 'Sin ventas'}</span>`;

        document.getElementById('statGanancia').textContent = `$${gananciaVentas.toLocaleString('es-CO')}`;
        document.getElementById('statDesgloseGanancia').innerHTML = `Utilidad: ${desgloseV || '-'}`;

      } catch (err) {
        mostrarAlerta('Error cargando dashboard: ' + err.message, 'error');
      }
    }

    /* ==================== ALQUILERES ==================== */
    async function cargarAlquileres() {
      if (!initSupabase()) return;
      const hoy = new Date().toISOString().split('T')[0];
      document.getElementById('alquilerFecha').value = hoy;
      if (!document.getElementById('alqFiltroDesde').value) document.getElementById('alqFiltroDesde').value = hoy;
      if (!document.getElementById('alqFiltroHasta').value) document.getElementById('alqFiltroHasta').value = hoy;

      try {
        const { data: canoas } = await sbClient.from('productos').select('*').eq('tipo', 'ALQUILER').order('nombre');
        const select = document.getElementById('alquilerCanoa');
        select.innerHTML = '<option value="">-- Seleccione Canoa --</option>';
        (canoas || []).forEach(p => {
          select.innerHTML += `<option value="${p.codigo}" data-precio="${p.precio_venta}" data-nombre="${p.nombre}">${p.nombre} ($${parseFloat(p.precio_venta).toLocaleString('es-CO')})</option>`;
        });
        cargarTablaAlquileres();
      } catch (e) { mostrarAlerta('Error cargando alquileres: ' + e.message, 'error'); }
    }

    function calcularTotalAlquiler() {
      const select = document.getElementById('alquilerCanoa');
      const cant = parseFloat(document.getElementById('alquilerCantidad').value) || 0;
      const precio = select.options[select.selectedIndex]?.getAttribute('data-precio') || 0;
      const total = cant * parseFloat(precio);
      document.getElementById('alquilerTotal').value = `$${total.toLocaleString('es-CO')}`;
    }

    async function registrarAlquiler(event) {
      event.preventDefault();
      if (!initSupabase()) return;

      const select = document.getElementById('alquilerCanoa');
      const codigo = select.value;
      const precioVenta = parseFloat(select.options[select.selectedIndex]?.getAttribute('data-precio') || 0);
      const cant = parseFloat(document.getElementById('alquilerCantidad').value) || 1;
      const fecha = document.getElementById('alquilerFecha').value;
      const obs = document.getElementById('alquilerObs').value;
      const btn = document.getElementById('btnAlquiler');
      btn.disabled = true; btn.textContent = 'Registrando...';

      const ganancia = precioVenta * cant;

      try {
        const { error } = await sbClient.from('movimientos').insert([{
          codigo: codigo,
          fecha: fecha,
          tipo: 'SALIDA',
          cantidad: cant,
          usuario: usuarioActual ? usuarioActual.nombre : 'Sistema',
          observaciones: obs,
          precio_costo: 0,
          precio_venta: precioVenta,
          ganancia: ganancia
        }]);

        btn.disabled = false; btn.textContent = 'Registrar Alquiler';
        if (error) throw error;

        mostrarAlerta('Alquiler registrado con éxito', 'success');
        document.getElementById('formAlquiler').reset();
        document.getElementById('alquilerFecha').value = fecha;
        calcularTotalAlquiler();
        cargarTablaAlquileres();
        if (usuarioActual.rol === 'ADMIN') cargarDashboard();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Registrar Alquiler';
        mostrarAlerta('Error: ' + err.message, 'error');
      }
    }

    async function cargarTablaAlquileres() {
      const hoy = new Date().toISOString().split('T')[0];
      const desde = document.getElementById('alqFiltroDesde')?.value || hoy;
      const hasta = document.getElementById('alqFiltroHasta')?.value || hoy;
      const filtroCanoaNombre = (document.getElementById('alqFiltroCanoaNombre')?.value || '').toLowerCase();
      try {
        const { data: movs } = await sbClient.from('movimientos').select('*').eq('tipo', 'SALIDA').gte('fecha', desde).lte('fecha', hasta).order('id', { ascending: false });
        const { data: prods } = await sbClient.from('productos').select('codigo, nombre, tipo');
        const prodMap = {};
        (prods || []).forEach(p => { prodMap[p.codigo] = p; });

        const tbody = document.getElementById('tablaAlquileresBody');
        let filtered = (movs || []).filter(m => prodMap[m.codigo]?.tipo === 'ALQUILER');
        if (filtroCanoaNombre) filtered = filtered.filter(m => (prodMap[m.codigo]?.nombre || '').toLowerCase().includes(filtroCanoaNombre));

        // Totales del período
        const totalRec = filtered.reduce((a, m) => a + parseFloat(m.ganancia || 0), 0);
        const totalCant = filtered.reduce((a, m) => a + parseFloat(m.cantidad || 0), 0);
        const totBar = document.getElementById('alqTotalesBar');
        if (totBar) {
          if (filtered.length > 0) {
            totBar.innerHTML = `<div style="display:inline-flex;gap:16px;align-items:center;background:linear-gradient(135deg,#8b5cf6,#6d28d9);padding:10px 18px;border-radius:10px;color:white;flex-wrap:wrap;">
              <span style="font-size:0.82rem;opacity:0.9;">🛶 ${totalCant} alquiler(es)</span>
              <span style="font-size:1.3rem;font-weight:800;">$${totalRec.toLocaleString('es-CO')}</span>
            </div>`;
          } else { totBar.innerHTML = ''; }
        }

        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay alquileres en el período seleccionado</td></tr>';
          return;
        }

        tbody.innerHTML = filtered.map(m => `
          <tr>
            <td>${m.fecha}</td>
            <td>${prodMap[m.codigo]?.nombre || m.codigo}</td>
            <td>${m.cantidad}</td>
            <td>$${parseFloat(m.ganancia || 0).toLocaleString('es-CO')}</td>
            <td>${m.observaciones || '-'}</td>
          </tr>
        `).join('');
      } catch (e) { mostrarAlerta('Error cargando tabla alquileres: ' + e.message, 'error'); }
    }

    /* ==================== TAQUILLA ==================== */
    async function cargarTaquilla() {
      const hoy = new Date().toISOString().split('T')[0];
      document.getElementById('taquillaFecha').value = hoy;
      if (!document.getElementById('taqFiltroDesde').value) document.getElementById('taqFiltroDesde').value = hoy;
      if (!document.getElementById('taqFiltroHasta').value) document.getElementById('taqFiltroHasta').value = hoy;
      cargarTablaTaquilla();
    }

    async function cargarTablaTaquilla() {
      if (!sbClient) return;
      const hoy = new Date().toISOString().split('T')[0];
      const desde = document.getElementById('taqFiltroDesde')?.value || hoy;
      const hasta = document.getElementById('taqFiltroHasta')?.value || hoy;
      try {
        const { data: movs } = await sbClient.from('movimientos').select('*').eq('tipo', 'SALIDA').gte('fecha', desde).lte('fecha', hasta).order('id', { ascending: false });
        const { data: prods } = await sbClient.from('productos').select('codigo, nombre, tipo');
        const prodMap = {};
        (prods || []).forEach(p => { prodMap[p.codigo] = p; });

        const tbody = document.getElementById('tablaTaquillaBody');
        const filtered = (movs || []).filter(m => prodMap[m.codigo]?.tipo === 'SERVICIO');

        // Totales por concepto
        let totCarros = 0, totTuristas = 0, totParticulares = 0, totRestaurante = 0;
        filtered.forEach(m => {
          const nom = (prodMap[m.codigo]?.nombre || '').toLowerCase();
          const gan = parseFloat(m.ganancia || 0);
          if (nom.includes('carro')) totCarros += gan;
          else if (nom.includes('turista')) totTuristas += gan;
          else if (nom.includes('particular')) totParticulares += gan;
          else totRestaurante += gan;
        });
        const totBar = document.getElementById('taqTotalesBar');
        if (totBar && filtered.length > 0) {
          const total = totCarros + totTuristas + totParticulares + totRestaurante;
          totBar.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:4px;">
            ${totCarros > 0 ? `<span class="badge badge-info" style="font-size:0.8rem;padding:5px 10px;">🚗 $${totCarros.toLocaleString('es-CO')}</span>` : ''}
            ${totTuristas > 0 ? `<span class="badge badge-success" style="font-size:0.8rem;padding:5px 10px;">👥 $${totTuristas.toLocaleString('es-CO')}</span>` : ''}
            ${totParticulares > 0 ? `<span class="badge badge-warning" style="font-size:0.8rem;padding:5px 10px;">👤 $${totParticulares.toLocaleString('es-CO')}</span>` : ''}
            ${totRestaurante > 0 ? `<span class="badge badge-info" style="font-size:0.8rem;padding:5px 10px;">🍽️ $${totRestaurante.toLocaleString('es-CO')}</span>` : ''}
            <span style="font-size:0.9rem;font-weight:700;color:var(--primary-color);">TOTAL: $${total.toLocaleString('es-CO')}</span>
          </div>`;
        } else if (totBar) { totBar.innerHTML = ''; }

        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay registros de taquilla en el período seleccionado</td></tr>';
          return;
        }

        tbody.innerHTML = filtered.map(m => `
          <tr>
            <td>${m.fecha}</td>
            <td>${prodMap[m.codigo]?.nombre || m.codigo}</td>
            <td>${m.cantidad}</td>
            <td>$${parseFloat(m.ganancia || 0).toLocaleString('es-CO')}</td>
          </tr>
        `).join('');
      } catch (e) { mostrarAlerta('Error cargando taquilla: ' + e.message, 'error'); }
    }

    async function registrarTaquilla(event) {
      event.preventDefault();
      if (!initSupabase()) return;

      const fecha = document.getElementById('taquillaFecha').value;
      const carros = parseInt(document.getElementById('taquillaCarros').value) || 0;
      const turistas = parseInt(document.getElementById('taquillaTuristas').value) || 0;
      const particulares = parseInt(document.getElementById('taquillaParticulares').value) || 0;
      const desayunos = parseInt(document.getElementById('taquillaDesayunos').value) || 0;
      const almuerzos = parseInt(document.getElementById('taquillaAlmuerzos').value) || 0;
      const comidas = parseInt(document.getElementById('taquillaComidas').value) || 0;

      if (carros === 0 && turistas === 0 && particulares === 0 && desayunos === 0 && almuerzos === 0 && comidas === 0) {
        return mostrarAlerta('Debe registrar al menos 1 valor', 'warning');
      }

      const btn = document.getElementById('btnTaquilla');
      btn.disabled = true; btn.textContent = 'Registrando...';

      const usuarioNom = usuarioActual ? usuarioActual.nombre : 'Sistema';
      const movimientos = [];
      if (carros > 0) movimientos.push({ codigo: '13', cantidad: carros, fecha, tipo: 'SALIDA', observaciones: 'Taquilla Carros', precio_venta: 30000, ganancia: carros * 30000, usuario: usuarioNom });
      if (turistas > 0) movimientos.push({ codigo: '14', cantidad: turistas, fecha, tipo: 'SALIDA', observaciones: 'Taquilla Turistas', precio_venta: 20000, ganancia: turistas * 20000, usuario: usuarioNom });
      if (particulares > 0) movimientos.push({ codigo: '18', cantidad: particulares, fecha, tipo: 'SALIDA', observaciones: 'Paso Particulares', precio_venta: 10000, ganancia: particulares * 10000, usuario: usuarioNom });
      if (desayunos > 0) movimientos.push({ codigo: '15', cantidad: desayunos, fecha, tipo: 'SALIDA', observaciones: 'Restaurante Desayuno', precio_venta: 25000, ganancia: desayunos * 25000, usuario: usuarioNom });
      if (almuerzos > 0) movimientos.push({ codigo: '16', cantidad: almuerzos, fecha, tipo: 'SALIDA', observaciones: 'Restaurante Almuerzo', precio_venta: 25000, ganancia: almuerzos * 25000, usuario: usuarioNom });
      if (comidas > 0) movimientos.push({ codigo: '17', cantidad: comidas, fecha, tipo: 'SALIDA', observaciones: 'Restaurante Comida', precio_venta: 25000, ganancia: comidas * 25000, usuario: usuarioNom });

      try {
        const { error } = await sbClient.from('movimientos').insert(movimientos);
        btn.disabled = false; btn.textContent = 'Registrar Taquilla';
        if (error) throw error;

        mostrarAlerta('Taquilla registrada con éxito', 'success');
        ['taquillaCarros', 'taquillaTuristas', 'taquillaParticulares', 'taquillaDesayunos', 'taquillaAlmuerzos', 'taquillaComidas'].forEach(id => {
          document.getElementById(id).value = 0;
        });
        cargarTablaTaquilla();
        if (usuarioActual.rol === 'ADMIN') cargarDashboard();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Registrar Taquilla';
        mostrarAlerta('Error: ' + err.message, 'error');
      }
    }

    /* ==================== INVENTARIO (ADMIN) ==================== */
    async function cargarInventario() {
      if (!initSupabase()) return;
      try {
        const [{ data: prods }, { data: movs }] = await Promise.all([
          sbClient.from('productos').select('*').order('nombre'),
          sbClient.from('movimientos').select('codigo, tipo, cantidad')
        ]);

        const stockMap = {};
        (movs || []).forEach(m => {
          const cod = m.codigo;
          const cant = parseFloat(m.cantidad || 0);
          if (!stockMap[cod]) stockMap[cod] = 0;
          if (m.tipo === 'INGRESO' || m.tipo === 'AJUSTE_POSITIVO' || m.tipo === 'AJUSTE') stockMap[cod] += cant;
          else if (m.tipo === 'SALIDA' || m.tipo === 'AJUSTE_NEGATIVO') stockMap[cod] -= cant;
        });

        stockGlobal = (prods || []).filter(p => p.tipo === 'INVENTARIO').map(p => ({
          ...p,
          cantidad: Math.max(0, stockMap[p.codigo] || 0)
        }));

        filtrarStock();
      } catch (err) {
        mostrarAlerta('Error cargando inventario: ' + err.message, 'error');
      }
    }

    function filtrarStock() {
      const t = document.getElementById('buscarStock').value.toLowerCase();
      const filtroEstado = document.getElementById('filtroEstadoInv')?.value || '';
      const filtroAlerta = document.getElementById('filtroAlertaInv')?.value || '';
      const tbody = document.getElementById('tablaInventarioBody');
      let filtered = stockGlobal.filter(p => {
        const matchText = p.nombre.toLowerCase().includes(t) || p.codigo.toString().toLowerCase().includes(t);
        const matchEstado = !filtroEstado || p.estado === filtroEstado;
        let matchAlerta = true;
        if (filtroAlerta === 'agotado') matchAlerta = p.cantidad <= 0;
        else if (filtroAlerta === 'bajo') matchAlerta = p.cantidad > 0 && p.cantidad <= p.stock_min && p.stock_min > 0;
        else if (filtroAlerta === 'normal') matchAlerta = p.cantidad > (p.stock_min || 0);
        return matchText && matchEstado && matchAlerta;
      });
      if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron productos</td></tr>'; return; }
      tbody.innerHTML = filtered.map(p => {
        let badge = p.cantidad <= 0 ? 'badge-danger' : (p.cantidad <= p.stock_min && p.stock_min > 0 ? 'badge-warning' : 'badge-success');
        let txt = p.cantidad <= 0 ? 'Agotado' : (p.cantidad <= p.stock_min && p.stock_min > 0 ? 'Bajo' : 'Normal');
        return `<tr>
          <td><strong>${p.codigo}</strong></td>
          <td>${p.nombre}${p.grupo ? `<br><span style="font-size:0.7rem;color:var(--text-muted);">${p.grupo}</span>` : ''}</td>
          <td><strong>${p.cantidad}</strong><br><span class="badge ${badge}">${txt}</span></td>
          <td>$${parseFloat(p.precio_costo || 0).toLocaleString('es-CO')}</td>
          <td>$${parseFloat(p.precio_venta || 0).toLocaleString('es-CO')}</td>
          <td><span class="badge ${p.estado === 'ACTIVO' ? 'badge-success' : 'badge-danger'}">${p.estado}</span></td>
          <td>
            <div style="display:flex; gap:4px; flex-wrap:nowrap;">
              <button class="btn btn-primary" style="padding:4px 8px; font-size:0.75rem;" onclick="abrirModalMovimiento('${p.codigo}')" title="Registrar Movimiento">Mov.</button>
              <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; background:#4b5563; color:white;" onclick="abrirModalEditar('${p.codigo}')" title="Editar Producto">✏️</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    /* EDICIÓN DE PRODUCTOS */
    function abrirModalEditar(codigo) {
      const prod = stockGlobal.find(p => p.codigo.toString() === codigo.toString());
      if (!prod) return mostrarAlerta('Producto no encontrado', 'error');

      document.getElementById('editCodigo').value = prod.codigo;
      document.getElementById('editCodigoDisplay').value = prod.codigo;
      document.getElementById('editNombre').value = prod.nombre;
      document.getElementById('editPrecioCosto').value = prod.precio_costo;
      document.getElementById('editPrecioVenta').value = prod.precio_venta;
      document.getElementById('editStockMin').value = prod.stock_min;
      document.getElementById('editUnidad').value = prod.unidad || 'Unidades';
      document.getElementById('editGrupo').value = prod.grupo || 'General';
      document.getElementById('editTipo').value = prod.tipo || 'INVENTARIO';
      document.getElementById('editEstado').value = prod.estado || 'ACTIVO';

      document.getElementById('modalEditarProducto').style.display = 'flex';
    }

    function cerrarModalEditar() {
      document.getElementById('modalEditarProducto').style.display = 'none';
    }

    async function guardarEdicionProducto(event) {
      event.preventDefault();
      const codigo = document.getElementById('editCodigo').value;
      const btn = document.getElementById('btnGuardarEdit');
      btn.disabled = true; btn.textContent = 'Guardando...';

      const updates = {
        nombre: document.getElementById('editNombre').value.trim(),
        precio_costo: parseFloat(document.getElementById('editPrecioCosto').value) || 0,
        precio_venta: parseFloat(document.getElementById('editPrecioVenta').value) || 0,
        stock_min: parseInt(document.getElementById('editStockMin').value) || 0,
        unidad: document.getElementById('editUnidad').value.trim(),
        grupo: document.getElementById('editGrupo').value.trim(),
        tipo: document.getElementById('editTipo').value,
        estado: document.getElementById('editEstado').value
      };

      try {
        const { error } = await sbClient.from('productos').update(updates).eq('codigo', codigo);
        btn.disabled = false; btn.textContent = '💾 Guardar Cambios';
        if (error) throw error;

        mostrarAlerta('Producto actualizado con éxito', 'success');
        cerrarModalEditar();
        cargarInventario();
        cargarDashboard();
      } catch (err) {
        btn.disabled = false; btn.textContent = '💾 Guardar Cambios';
        mostrarAlerta('Error: ' + err.message, 'error');
      }
    }

    /* MODAL MOVIMIENTO */
    function abrirModalMovimiento(codigo = '') {
      document.getElementById('modalMovimiento').style.display = 'flex';
      const select = document.getElementById('movProducto');
      select.innerHTML = '<option value="">-- Seleccione --</option>';
      stockGlobal.forEach(p => { select.innerHTML += `<option value="${p.codigo}">${p.nombre}</option>`; });
      if (codigo) select.value = codigo;
    }

    function cerrarModal() { document.getElementById('modalMovimiento').style.display = 'none'; }

    async function registrarMovimiento(event) {
      event.preventDefault();
      const codigo = document.getElementById('movProducto').value;
      const tipo = document.getElementById('movTipo').value;
      const cantidad = parseFloat(document.getElementById('movCantidad').value) || 1;
      const obs = document.getElementById('movObs').value;
      const prod = stockGlobal.find(p => p.codigo === codigo) || {};

      const precioCosto = parseFloat(prod.precio_costo || 0);
      const precioVenta = parseFloat(prod.precio_venta || 0);
      const ganancia = (tipo === 'SALIDA') ? (precioVenta - precioCosto) * cantidad : 0;

      try {
        const { error } = await sbClient.from('movimientos').insert([{
          codigo,
          fecha: new Date().toISOString().split('T')[0],
          tipo,
          cantidad,
          observaciones: obs,
          usuario: usuarioActual ? usuarioActual.nombre : 'Sistema',
          precio_costo: precioCosto,
          precio_venta: precioVenta,
          ganancia: ganancia
        }]);

        if (error) throw error;
        mostrarAlerta('Movimiento registrado', 'success');
        cerrarModal();
        cargarInventario();
        cargarDashboard();
      } catch (err) {
        mostrarAlerta('Error: ' + err.message, 'error');
      }
    }

    /* ==================== HISTORIAL ==================== */
    async function cargarHistorial(event) {
      if (event) event.preventDefault();
      const desde = document.getElementById('fechaDesde').value;
      const hasta = document.getElementById('fechaHasta').value;
      const filtroTipo = document.getElementById('histFiltroTipo')?.value || '';
      const filtroProd = (document.getElementById('histFiltroProd')?.value || '').toLowerCase();

      try {
        let query = sbClient.from('movimientos').select('*').gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false });
        if (filtroTipo) query = query.eq('tipo', filtroTipo);

        const [{ data: movs }, { data: prods }] = await Promise.all([
          query,
          sbClient.from('productos').select('codigo, nombre')
        ]);

        const prodMap = {};
        (prods || []).forEach(p => { prodMap[p.codigo] = p.nombre; });

        let filtered = movs || [];
        if (filtroProd) filtered = filtered.filter(m => (prodMap[m.codigo] || '').toLowerCase().includes(filtroProd) || m.codigo.toString().toLowerCase().includes(filtroProd));

        // Totales
        const totalGanancia = filtered.reduce((a, m) => a + parseFloat(m.ganancia || 0), 0);
        const totBar = document.getElementById('histTotalesBar');
        if (totBar) {
          totBar.innerHTML = filtered.length > 0
            ? `<div style="font-size:0.82rem;color:var(--text-muted);">${filtered.length} movimiento(s) · Total: <strong style="color:var(--primary-color);">$${totalGanancia.toLocaleString('es-CO')}</strong></div>`
            : '';
        }

        const tbody = document.getElementById('tablaHistorialBody');
        if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay movimientos en el período seleccionado</td></tr>'; return; }

        tbody.innerHTML = filtered.map(m => {
          const tipoBadge = m.tipo === 'INGRESO' ? 'badge-success' : m.tipo === 'SALIDA' ? 'badge-info' : 'badge-warning';
          return `<tr>
            <td>${m.fecha}</td>
            <td><span class="badge ${tipoBadge}">${m.tipo}</span></td>
            <td>${prodMap[m.codigo] || m.codigo}</td>
            <td>${m.cantidad}</td>
            <td>$${parseFloat(m.ganancia || 0).toLocaleString('es-CO')}</td>
            <td>${m.usuario || '-'}</td>
          </tr>`;
        }).join('');
      } catch (err) {
        mostrarAlerta('Error: ' + err.message, 'error');
      }
    }

    /* ==================== FACTURAS ==================== */
    /* ==================== CATÁLOGO PARA FACTURAS (AUTOCOMPLETE) ==================== */
    let stockParaFactura = [];

    async function cargarStockParaFactura() {
      if (!sbClient) return;
      try {
        const { data: prods } = await sbClient.from('productos').select('*').eq('estado', 'ACTIVO').order('nombre');
        stockParaFactura = prods || [];
      } catch (e) { }
    }

    function buscarParaFactura() {
      const q = (document.getElementById('buscarProductoItem')?.value || '').toLowerCase().trim();
      const dropdown = document.getElementById('dropdownFactura');
      document.getElementById('codigoProductoItem').value = '';
      if (!q) { dropdown.style.display = 'none'; return; }

      const matches = stockParaFactura.filter(p =>
        p.nombre.toLowerCase().includes(q) || p.codigo.toString().includes(q)
      ).slice(0, 8);

      if (matches.length === 0) { dropdown.style.display = 'none'; return; }

      dropdown.innerHTML = matches.map(p => `
        <div onclick="seleccionarProductoFactura('${p.codigo}', \`${p.nombre.replace(/`/g, '\\`')}\`, ${p.precio_venta})"
          style="padding:9px 12px; cursor:pointer; border-bottom:1px solid var(--border-color); font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; transition:background 0.1s;"
          onmouseover="this.style.background='rgba(37,99,235,0.1)'" onmouseout="this.style.background=''">
          <div>
            <div style="font-weight:600;">${p.nombre}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">${p.grupo || ''} · ${p.tipo}</div>
          </div>
          <span style="color:var(--primary-color);font-weight:700;white-space:nowrap;">$${parseFloat(p.precio_venta).toLocaleString('es-CO')}</span>
        </div>
      `).join('');
      dropdown.style.display = 'block';
    }

    function seleccionarProductoFactura(codigo, nombre, precio) {
      document.getElementById('buscarProductoItem').value = nombre;
      document.getElementById('codigoProductoItem').value = codigo;
      document.getElementById('dropdownFactura').style.display = 'none';
      document.getElementById('cantidadItem').focus();
      document.getElementById('cantidadItem').select();
    }

    async function agregarItem() {
      const codigo = document.getElementById('codigoProductoItem').value.trim();
      const cantidad = parseFloat(document.getElementById('cantidadItem').value) || 0;
      if (!codigo) return mostrarAlerta('Selecciona un producto del buscador', 'warning');
      if (cantidad <= 0) return mostrarAlerta('La cantidad debe ser mayor a 0', 'warning');

      let prod = stockParaFactura.find(p => p.codigo.toString() === codigo.toString());
      if (!prod) {
        try {
          const { data: prodDb } = await sbClient.from('productos').select('*').eq('codigo', codigo).maybeSingle();
          if (!prodDb) return mostrarAlerta('Producto no encontrado', 'error');
          prod = prodDb;
        } catch (e) { mostrarAlerta('Error buscando producto', 'error'); return; }
      }

      const existente = facturasItems.find(i => i.codigo.toString() === codigo.toString());
      if (existente) existente.cantidad += cantidad;
      else facturasItems.push({ codigo: prod.codigo, nombre: prod.nombre, cantidad, precioUnitario: parseFloat(prod.precio_venta || 0) });

      renderItems();
      document.getElementById('buscarProductoItem').value = '';
      document.getElementById('codigoProductoItem').value = '';
      document.getElementById('cantidadItem').value = '1';
    }

    function renderItems() {
      const div = document.getElementById('itemsList');
      if (facturasItems.length === 0) { div.innerHTML = 'No hay items agregados'; return; }
      div.innerHTML = facturasItems.map((i, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:6px 10px; border-radius:5px; margin-bottom:5px; border:1px solid var(--border-color);">
          <span style="font-size:0.8rem;">${i.cantidad}x ${i.nombre} - $${(i.cantidad * i.precioUnitario).toLocaleString('es-CO')}</span>
          <button type="button" class="btn btn-danger" style="padding:2px 6px;" onclick="facturasItems.splice(${idx},1); renderItems();">X</button>
        </div>
      `).join('');
    }

    async function generarFactura(event) {
      event.preventDefault();
      if (facturasItems.length === 0) return mostrarAlerta('Agregue al menos un item', 'warning');

      const cliente = document.getElementById('clienteFactura').value;
      const nit = document.getElementById('nitFactura').value;
      const numeroFactura = `FAC-${Date.now()}`;
      const total = facturasItems.reduce((acc, i) => acc + (i.cantidad * i.precioUnitario), 0);

      try {
        const { error } = await sbClient.from('facturas').insert([{
          numero_factura: numeroFactura,
          cliente,
          nit,
          total,
          items: facturasItems,
          usuario: usuarioActual ? usuarioActual.nombre : 'Sistema'
        }]);

        if (error) throw error;

        mostrarAlerta(`Factura ${numeroFactura} guardada con éxito`, 'success');

        // Factura profesional
        const fechaStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <!DOCTYPE html><html><head><title>${numeroFactura}</title>
          <meta charset="UTF-8">
          <style>
            @page { margin: 1.5cm; size: A4; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 13px; }
            .wrap { padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 20px; }
            .empresa-nombre { font-size: 26px; font-weight: 900; color: #1e3a8a; letter-spacing: -0.5px; }
            .empresa-sub { font-size: 11px; color: #64748b; margin-top: 5px; }
            .factura-meta { text-align: right; }
            .factura-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
            .factura-numero { font-size: 20px; font-weight: 800; color: #1e3a8a; }
            .badge-emitida { display:inline-block; background:#dcfce7; color:#166534; padding:2px 10px; border-radius:20px; font-size:10px; font-weight:700; margin-top:6px; }
            .datos-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 22px; }
            .datos-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .datos-box-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-weight: 700; }
            .datos-valor { font-weight: 700; font-size: 14px; }
            .datos-sub { font-size: 11px; color: #64748b; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; }
            thead tr { background: #1e3a8a; color: white; }
            th { padding: 10px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            tbody tr:last-child td { border-bottom: none; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .col-right { text-align: right; }
            .col-center { text-align: center; }
            .total-section { margin-top: 16px; border-top: 2px solid #1e3a8a; padding-top: 12px; display: flex; justify-content: flex-end; align-items: baseline; gap: 20px; }
            .total-label-txt { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .total-valor { font-size: 28px; font-weight: 900; color: #1e3a8a; }
            .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 65px; }
            .firma-linea { border-top: 1px solid #94a3b8; padding-top: 7px; text-align: center; }
            .firma-titulo { font-size: 11px; color: #64748b; }
            .firma-nombre { font-size: 10px; color: #94a3b8; margin-top: 3px; }
            .footer { text-align: center; margin-top: 35px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
            .footer p { font-size: 11px; color: #94a3b8; line-height: 1.6; }
            .footer strong { color: #1e3a8a; }
          </style></head>
          <body><div class="wrap">
          <div class="header">
            <div>
              <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">🏕️ SISTEMA DE GESTIÓN</div>
              <div class="empresa-nombre">Finca Juriepe</div>
              <div class="empresa-sub">MACOLLA · Control de Ventas e Inventario</div>
            </div>
            <div class="factura-meta">
              <div class="factura-label">Número de Factura</div>
              <div class="factura-numero">${numeroFactura}</div>
              <div style="margin-top:8px;"><div class="factura-label">Fecha de Emisión</div>
              <div style="font-weight:600;font-size:12px;margin-top:2px;">${fechaStr}</div></div>
              <div class="badge-emitida">✓ Emitida</div>
            </div>
          </div>

          <div class="datos-grid">
            <div class="datos-box">
              <div class="datos-box-label">👤 Cliente</div>
              <div class="datos-valor">${cliente}</div>
              <div class="datos-sub">NIT / Cédula: <strong>${nit}</strong></div>
            </div>
            <div class="datos-box">
              <div class="datos-box-label">🏕️ Emisor</div>
              <div class="datos-valor">Finca Juriepe</div>
              <div class="datos-sub">Registrado por: <strong>${usuarioActual ? usuarioActual.nombre : 'Sistema'}</strong></div>
              <div class="datos-sub">Fecha: ${new Date().toLocaleDateString('es-CO')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:55px;">Cód.</th>
                <th>Descripción del Producto / Servicio</th>
                <th style="width:65px;" class="col-center">Cant.</th>
                <th style="width:120px;" class="col-right">Precio Unit.</th>
                <th style="width:130px;" class="col-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${facturasItems.map(i => `
              <tr>
                <td style="color:#94a3b8;font-size:11px;">${i.codigo}</td>
                <td><strong>${i.nombre}</strong></td>
                <td class="col-center">${i.cantidad}</td>
                <td class="col-right">$${i.precioUnitario.toLocaleString('es-CO')}</td>
                <td class="col-right"><strong>$${(i.cantidad * i.precioUnitario).toLocaleString('es-CO')}</strong></td>
              </tr>`).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <span class="total-label-txt">Total a Pagar</span>
            <span class="total-valor">$${total.toLocaleString('es-CO')}</span>
          </div>

          <div class="firmas">
            <div class="firma-linea">
              <div class="firma-titulo">Firma del Cliente</div>
              <div class="firma-nombre">${cliente}</div>
            </div>
            <div class="firma-linea">
              <div class="firma-titulo">Firma del Responsable</div>
              <div class="firma-nombre">${usuarioActual ? usuarioActual.nombre : 'Sistema'} · Finca Juriepe</div>
            </div>
          </div>

          <div class="footer">
            <p>¡Gracias por visitarnos! · <strong>Finca Juriepe - Macolla</strong></p>
            <p>Este documento es un comprobante de venta generado por el Sistema Macolla</p>
          </div>
          </div>
          <script>window.print();<\/script>
          </body></html>
        `);
        printWindow.document.close();

        facturasItems = []; renderItems();
        document.getElementById('formFactura').reset();
      } catch (err) {
        mostrarAlerta('Error guardando factura: ' + err.message, 'error');
      }
    }

    /* ==================== CONFIGURACIÓN ==================== */
    function abrirModalConfig() {
      const cfg = obtenerSbConfig();
      document.getElementById('inputSbUrl').value = cfg.url;
      document.getElementById('inputSbKey').value = cfg.key;
      document.getElementById('modalConfig').style.display = 'flex';
    }

    function cerrarModalConfig() {
      document.getElementById('modalConfig').style.display = 'none';
    }

    function guardarConfigSupabase() {
      const url = limpiarUrlSupabase(document.getElementById('inputSbUrl').value.trim());
      const key = document.getElementById('inputSbKey').value.trim();

      if (!url || !key) return mostrarAlerta('Debes ingresar URL y Key', 'warning');

      localStorage.setItem('juriepe_sb_url', url);
      localStorage.setItem('juriepe_sb_key', key);
      cerrarModalConfig();
      mostrarAlerta('Configuración guardada', 'success');
      initSupabase();
    }

    /* ==================== NUEVO PRODUCTO ==================== */
    function abrirModalNuevoProducto() {
      document.getElementById('formNuevoProducto').reset();
      document.getElementById('nuevoUnidad').value = 'Unidades';
      document.getElementById('modalNuevoProducto').style.display = 'flex';
    }

    function cerrarModalNuevoProducto() {
      document.getElementById('modalNuevoProducto').style.display = 'none';
    }

    async function crearProducto(event) {
      event.preventDefault();
      const btn = document.getElementById('btnCrearProducto');
      btn.disabled = true; btn.textContent = 'Creando...';

      let codigo = document.getElementById('nuevoCodigo').value.trim();
      const nombre = document.getElementById('nuevoNombre').value.trim();
      const precioCosto = parseFloat(document.getElementById('nuevoPrecioCosto').value) || 0;
      const precioVenta = parseFloat(document.getElementById('nuevoPrecioVenta').value) || 0;
      const tipo = document.getElementById('nuevoTipo').value;
      const grupo = document.getElementById('nuevoGrupo').value.trim() || 'General';
      const unidad = document.getElementById('nuevoUnidad').value.trim() || 'Unidades';
      const stockMin = parseInt(document.getElementById('nuevoStockMin').value) || 0;
      const stockInicial = parseInt(document.getElementById('nuevoStockInicial').value) || 0;

      try {
        // Si el usuario no especificó un código manual, calculamos el siguiente código correlativo numérico
        if (!codigo) {
          const { data: todosProds } = await sbClient.from('productos').select('codigo');
          let maxCod = 0;
          (todosProds || []).forEach(p => {
            const num = parseInt(p.codigo, 10);
            if (!isNaN(num) && num > maxCod) maxCod = num;
          });
          codigo = String(maxCod + 1);
        }

        const { data: prod, error: errProd } = await sbClient.from('productos').insert([{
          codigo,
          nombre,
          precio_costo: precioCosto,
          precio_venta: precioVenta,
          tipo,
          grupo,
          unidad,
          stock_min: stockMin,
          estado: 'ACTIVO'
        }]).select().single();

        if (errProd) throw errProd;

        if (stockInicial > 0 && prod) {
          await sbClient.from('movimientos').insert([{
            codigo: prod.codigo,
            fecha: new Date().toISOString().split('T')[0],
            tipo: 'INGRESO',
            cantidad: stockInicial,
            observaciones: 'Stock inicial al crear producto',
            usuario: usuarioActual ? usuarioActual.nombre : 'Sistema',
            precio_costo: precioCosto,
            precio_venta: precioVenta,
            ganancia: 0
          }]);
        }

        btn.disabled = false; btn.textContent = '✅ Crear Producto';
        mostrarAlerta(`✅ Producto "${nombre}" (Cód: ${codigo}) creado con éxito`, 'success');
        cerrarModalNuevoProducto();
        cargarInventario();
        cargarStockParaFactura();
      } catch (err) {
        btn.disabled = false; btn.textContent = '✅ Crear Producto';
        mostrarAlerta('Error al crear producto: ' + err.message, 'error');
      }
    }

    /* ==================== TEMA ==================== */
    function toggleTheme() {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      document.getElementById('themeBtn').textContent = isDark ? '☀️ Modo' : '🌙 Modo';
      localStorage.setItem('juriepe_sb_theme', isDark ? 'dark' : 'light');
    }

    /* ==================== INICIALIZACIÓN ==================== */
    window.onload = () => {
      if (localStorage.getItem('juriepe_sb_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeBtn').textContent = '☀️ Modo';
      }

      const hoy = new Date().toISOString().split('T')[0];
      if (document.getElementById('dashDesde')) document.getElementById('dashDesde').value = hoy;
      if (document.getElementById('dashHasta')) document.getElementById('dashHasta').value = hoy;
      if (document.getElementById('fechaDesde')) document.getElementById('fechaDesde').value = hoy;
      if (document.getElementById('fechaHasta')) document.getElementById('fechaHasta').value = hoy;

      initSupabase();

      // Cerrar dropdown de facturas al hacer clic fuera
      document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('dropdownFactura');
        const input = document.getElementById('buscarProductoItem');
        if (dropdown && input && !input.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });

      const sesion = localStorage.getItem('juriepe_sb_user');
      if (sesion) {
        try {
          usuarioActual = JSON.parse(sesion);
          iniciarAppConUsuario();
        } catch (e) {
          localStorage.removeItem('juriepe_sb_user');
        }
      }
    };
