/**
 * ThesisForge AI - HTML de la SPA
 * Frontend completo servido desde Hono
 */

export function getMainHTML(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ThesisForge AI v2.0 - Generador de Tesis con IA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
    :root {
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --secondary: #8b5cf6;
      --accent: #06b6d4;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --dark: #0f172a;
      --card: #1e293b;
      --border: #334155;
    }
    body { background: var(--dark); color: #e2e8f0; min-height: 100vh; }
    .gradient-text { background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .gradient-bg { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; }
    .card-hover { transition: all 0.2s ease; }
    .card-hover:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,0.2); }
    .btn { padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; font-size: 14px; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
    .btn-secondary { background: var(--card); border: 1px solid var(--border); color: #e2e8f0; }
    .btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
    .btn-danger { background: var(--danger); color: white; }
    .btn-danger:hover { background: #dc2626; }
    .btn-success { background: var(--success); color: white; }
    .btn-success:hover { background: #059669; }
    .btn-warning { background: var(--warning); color: white; }
    .btn-warning:hover { background: #d97706; }
    .btn-lg { padding: 12px 24px; font-size: 16px; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .input { background: #0f172a; border: 1px solid var(--border); color: #e2e8f0; border-radius: 8px; padding: 10px 14px; width: 100%; font-size: 14px; transition: border-color 0.2s; }
    .input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .label { display: block; font-size: 13px; font-weight: 500; color: #94a3b8; margin-bottom: 6px; }
    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-blue { background: rgba(99,102,241,0.2); color: #818cf8; }
    .badge-green { background: rgba(16,185,129,0.2); color: #34d399; }
    .badge-yellow { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .badge-red { background: rgba(239,68,68,0.2); color: #f87171; }
    .badge-gray { background: rgba(100,116,139,0.2); color: #94a3b8; }
    .badge-purple { background: rgba(139,92,246,0.2); color: #a78bfa; }
    .sidebar { background: var(--card); border-right: 1px solid var(--border); }
    .sidebar-item { padding: 10px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; font-size: 14px; color: #94a3b8; }
    .sidebar-item:hover, .sidebar-item.active { background: rgba(99,102,241,0.15); color: var(--primary); }
    .sidebar-item .icon { width: 20px; text-align: center; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal { background: var(--card); border: 1px solid var(--border); border-radius: 16px; max-width: 680px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 32px; }
    .toast { position: fixed; bottom: 24px; right: 24px; z-index: 9999; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; display: flex; align-items: center; gap: 10px; animation: slideIn 0.3s ease; }
    .toast-success { background: #065f46; color: #6ee7b7; border: 1px solid #059669; }
    .toast-error { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; }
    .toast-info { background: #1e3a5f; color: #93c5fd; border: 1px solid #3b82f6; }
    @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    .progress-bar { height: 6px; background: #1e293b; border-radius: 99px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary)); border-radius: 99px; transition: width 0.5s ease; }
    .chapter-card { border: 1px solid var(--border); border-radius: 10px; padding: 16px; transition: all 0.2s; }
    .chapter-card:hover { border-color: var(--primary); }
    .chapter-card.completed { border-color: var(--success); background: rgba(16,185,129,0.05); }
    .chapter-card.generating { border-color: var(--warning); background: rgba(245,158,11,0.05); }
    .chapter-card.error { border-color: var(--danger); background: rgba(239,68,68,0.05); }
    .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
    .editor-area { background: #0a0f1a; border: 1px solid var(--border); border-radius: 8px; padding: 20px; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.8; color: #e2e8f0; min-height: 400px; resize: vertical; white-space: pre-wrap; }
    .nav-tab { padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; color: #94a3b8; }
    .nav-tab.active { background: rgba(99,102,241,0.15); color: var(--primary); font-weight: 600; }
    .table-row { border-bottom: 1px solid var(--border); transition: background 0.15s; }
    .table-row:hover { background: rgba(99,102,241,0.05); }
    #app { display: none; }
    #auth-screen { display: flex; }
    .loading-pulse { animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0f172a; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }
    .ai-provider-btn { border: 2px solid var(--border); border-radius: 10px; padding: 12px; cursor: pointer; transition: all 0.2s; text-align: center; }
    .ai-provider-btn.selected { border-color: var(--primary); background: rgba(99,102,241,0.1); }
    select.input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
  </style>
</head>
<body>

<!-- ══════════════════════════ PANTALLA AUTH ══════════════════════════════ -->
<div id="auth-screen" class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-10">
      <div class="inline-flex items-center justify-center w-16 h-16 gradient-bg rounded-2xl mb-4">
        <i class="fas fa-graduation-cap text-white text-3xl"></i>
      </div>
      <h1 class="text-3xl font-bold gradient-text">ThesisForge AI</h1>
      <p class="text-slate-400 mt-2">Generador de tesis con IA para instituciones venezolanas</p>
    </div>

    <!-- Tabs Login/Registro -->
    <div class="card p-8">
      <div class="flex mb-8 bg-slate-800 rounded-lg p-1">
        <button onclick="showTab('login')" id="tab-login" class="flex-1 py-2 rounded-md text-sm font-medium transition-all bg-indigo-600 text-white">
          Iniciar Sesión
        </button>
        <button onclick="showTab('register')" id="tab-register" class="flex-1 py-2 rounded-md text-sm font-medium transition-all text-slate-400">
          Registrarse
        </button>
      </div>

      <!-- Login Form -->
      <div id="form-login">
        <div class="space-y-4">
          <div>
            <label class="label">Usuario o Email</label>
            <input id="login-username" type="text" class="input" placeholder="tu_usuario o email@ejemplo.com" autocomplete="username">
          </div>
          <div>
            <label class="label">Contraseña</label>
            <div class="relative">
              <input id="login-password" type="password" class="input" placeholder="••••••••" autocomplete="current-password">
              <button type="button" onclick="togglePwd('login-password')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                <i class="fas fa-eye text-sm"></i>
              </button>
            </div>
          </div>
          <button onclick="doLogin()" class="btn btn-primary btn-lg w-full justify-center">
            <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
          </button>
        </div>
        <p class="text-center text-slate-500 text-xs mt-4">
          Demo: admin / Admin@2024!
        </p>
      </div>

      <!-- Register Form -->
      <div id="form-register" class="hidden">
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">Username *</label>
              <input id="reg-username" type="text" class="input" placeholder="tu_usuario">
            </div>
            <div>
              <label class="label">Nombre Completo *</label>
              <input id="reg-fullname" type="text" class="input" placeholder="Tu Nombre">
            </div>
          </div>
          <div>
            <label class="label">Email *</label>
            <input id="reg-email" type="email" class="input" placeholder="email@ejemplo.com">
          </div>
          <div>
            <label class="label">Institución</label>
            <input id="reg-institution" type="text" class="input" placeholder="IUTA, IUTAR, UCV...">
          </div>
          <div>
            <label class="label">Contraseña * (mín. 8 caracteres)</label>
            <div class="relative">
              <input id="reg-password" type="password" class="input" placeholder="••••••••">
              <button type="button" onclick="togglePwd('reg-password')" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                <i class="fas fa-eye text-sm"></i>
              </button>
            </div>
          </div>
          <button onclick="doRegister()" class="btn btn-primary btn-lg w-full justify-center">
            <i class="fas fa-user-plus"></i> Crear Cuenta
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════ APP PRINCIPAL ══════════════════════════════ -->
<div id="app" class="flex h-screen overflow-hidden">

  <!-- Sidebar -->
  <aside class="sidebar w-64 flex flex-col h-full flex-shrink-0">
    <div class="p-5 border-b border-slate-700">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 gradient-bg rounded-lg flex items-center justify-center">
          <i class="fas fa-graduation-cap text-white text-sm"></i>
        </div>
        <div>
          <h2 class="font-bold text-sm text-white">ThesisForge AI</h2>
          <p class="text-xs text-slate-400">v2.0</p>
        </div>
      </div>
    </div>

    <!-- User Info -->
    <div class="p-4 border-b border-slate-700">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold" id="sidebar-avatar">A</div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate" id="sidebar-username">Usuario</p>
          <p class="text-xs text-slate-400" id="sidebar-plan">Plan Free</p>
        </div>
      </div>
    </div>

    <!-- Nav Items -->
    <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
      <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Principal</div>
      <div onclick="navigate('dashboard')" id="nav-dashboard" class="sidebar-item active">
        <i class="fas fa-th-large icon"></i> Dashboard
      </div>
      <div onclick="navigate('projects')" id="nav-projects" class="sidebar-item">
        <i class="fas fa-folder icon"></i> Mis Proyectos
      </div>
      <div onclick="navigate('new-project')" id="nav-new-project" class="sidebar-item">
        <i class="fas fa-plus-circle icon"></i> Nuevo Proyecto
      </div>

      <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mt-4 mb-2">Cuenta</div>
      <div onclick="navigate('profile')" id="nav-profile" class="sidebar-item">
        <i class="fas fa-user-cog icon"></i> Mi Perfil
      </div>
      <div onclick="navigate('admin')" id="nav-admin" class="sidebar-item hidden">
        <i class="fas fa-shield-alt icon"></i> Administración
      </div>
    </nav>

    <div class="p-3 border-t border-slate-700">
      <div onclick="doLogout()" class="sidebar-item text-red-400 hover:bg-red-900/20 hover:text-red-300">
        <i class="fas fa-sign-out-alt icon"></i> Cerrar Sesión
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 flex flex-col overflow-hidden">
    <!-- Top Bar -->
    <header class="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900">
      <h1 class="text-xl font-semibold text-white" id="page-title">Dashboard</h1>
      <div class="flex items-center gap-3">
        <span class="badge badge-blue" id="header-plan-badge">Free</span>
        <button onclick="navigate('new-project')" class="btn btn-primary btn-sm">
          <i class="fas fa-plus"></i> Nuevo Proyecto
        </button>
      </div>
    </header>

    <!-- Page Content -->
    <div class="flex-1 overflow-y-auto p-6" id="page-content">
      <!-- Contenido dinámico aquí -->
    </div>
  </main>
</div>

<!-- ══════════════════════════ MODALES ══════════════════════════════════ -->

<!-- Modal Ver/Editar Capítulo -->
<div id="chapter-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 900px; width: 98%;">
    <div class="flex items-start justify-between mb-6">
      <h3 class="text-xl font-bold text-white" id="chapter-modal-title">Capítulo</h3>
      <button onclick="closeModal('chapter-modal')" class="text-slate-400 hover:text-white text-xl">&times;</button>
    </div>
    <div class="mb-4 flex gap-2">
      <button onclick="toggleChapterEdit()" id="btn-edit-chapter" class="btn btn-secondary btn-sm">
        <i class="fas fa-edit"></i> Editar
      </button>
      <button onclick="saveChapterEdit()" id="btn-save-chapter" class="btn btn-success btn-sm hidden">
        <i class="fas fa-save"></i> Guardar
      </button>
      <button onclick="copyChapterContent()" class="btn btn-secondary btn-sm">
        <i class="fas fa-copy"></i> Copiar
      </button>
    </div>
    <div id="chapter-content-view" class="editor-area overflow-y-auto" style="max-height: 60vh;"></div>
    <textarea id="chapter-content-edit" class="editor-area hidden w-full" style="height: 60vh;" oninput="countChapterWords()"></textarea>
    <div class="flex justify-between items-center mt-4 text-xs text-slate-400">
      <span id="chapter-word-count">0 palabras</span>
      <span>Normativa APA 7</span>
    </div>
  </div>
</div>

<!-- Modal Agregar Cita -->
<div id="citation-modal" class="modal-overlay hidden">
  <div class="modal">
    <div class="flex items-start justify-between mb-6">
      <h3 class="text-xl font-bold text-white">Agregar Referencia Bibliográfica</h3>
      <button onclick="closeModal('citation-modal')" class="text-slate-400 hover:text-white text-xl">&times;</button>
    </div>
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Autores *</label>
          <input id="cit-authors" type="text" class="input" placeholder="Apellido, N. y Apellido2, N.">
        </div>
        <div>
          <label class="label">Año</label>
          <input id="cit-year" type="number" class="input" placeholder="2024">
        </div>
      </div>
      <div>
        <label class="label">Título *</label>
        <input id="cit-title" type="text" class="input" placeholder="Título del trabajo">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Tipo</label>
          <select id="cit-type" class="input">
            <option value="article">Artículo de Revista</option>
            <option value="book">Libro</option>
            <option value="website">Sitio Web</option>
            <option value="thesis">Tesis</option>
          </select>
        </div>
        <div>
          <label class="label">Fuente / Revista / Editorial</label>
          <input id="cit-source" type="text" class="input" placeholder="Nombre de la fuente">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">URL</label>
          <input id="cit-url" type="url" class="input" placeholder="https://...">
        </div>
        <div>
          <label class="label">DOI</label>
          <input id="cit-doi" type="text" class="input" placeholder="10.xxxx/xxxxx">
        </div>
      </div>
      <div>
        <label class="label">Formato APA completo (opcional, se genera automáticamente)</label>
        <textarea id="cit-apa" class="input" rows="2" placeholder="Referencia completa en formato APA 7..."></textarea>
      </div>
      <div class="flex gap-3 pt-2">
        <button onclick="saveCitation()" class="btn btn-primary flex-1 justify-center">
          <i class="fas fa-plus"></i> Agregar Referencia
        </button>
        <button onclick="closeModal('citation-modal')" class="btn btn-secondary">Cancelar</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal Confirmar Eliminar -->
<div id="confirm-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width: 400px;">
    <div class="text-center">
      <div class="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
        <i class="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
      </div>
      <h3 class="text-xl font-bold text-white mb-2" id="confirm-title">¿Confirmar acción?</h3>
      <p class="text-slate-400 mb-6" id="confirm-message">Esta acción no se puede deshacer.</p>
      <div class="flex gap-3 justify-center">
        <button onclick="executeConfirm()" class="btn btn-danger px-8">
          <i class="fas fa-trash"></i> Confirmar
        </button>
        <button onclick="closeModal('confirm-modal')" class="btn btn-secondary px-8">Cancelar</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal Perfil -->
<div id="profile-modal" class="modal-overlay hidden">
  <div class="modal">
    <div class="flex items-start justify-between mb-6">
      <h3 class="text-xl font-bold text-white">Editar Perfil</h3>
      <button onclick="closeModal('profile-modal')" class="text-slate-400 hover:text-white text-xl">&times;</button>
    </div>
    <div class="space-y-4">
      <div>
        <label class="label">Nombre Completo</label>
        <input id="prof-fullname" type="text" class="input">
      </div>
      <div>
        <label class="label">Institución</label>
        <input id="prof-institution" type="text" class="input">
      </div>
      <div class="border-t border-slate-700 pt-4">
        <p class="text-sm text-slate-400 mb-3">Cambiar Contraseña (opcional)</p>
        <div class="space-y-3">
          <input id="prof-current-pwd" type="password" class="input" placeholder="Contraseña actual">
          <input id="prof-new-pwd" type="password" class="input" placeholder="Nueva contraseña (mín. 8 chars)">
        </div>
      </div>
      <div class="flex gap-3 pt-2">
        <button onclick="saveProfile()" class="btn btn-primary flex-1 justify-center">
          <i class="fas fa-save"></i> Guardar Cambios
        </button>
        <button onclick="closeModal('profile-modal')" class="btn btn-secondary">Cancelar</button>
      </div>
    </div>
  </div>
</div>

<!-- Admin: Modal Editar Usuario -->
<div id="admin-user-modal" class="modal-overlay hidden">
  <div class="modal">
    <div class="flex items-start justify-between mb-6">
      <h3 class="text-xl font-bold text-white">Editar Usuario</h3>
      <button onclick="closeModal('admin-user-modal')" class="text-slate-400 hover:text-white text-xl">&times;</button>
    </div>
    <div class="space-y-4">
      <input type="hidden" id="admin-edit-user-id">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label">Nombre Completo</label>
          <input id="admin-edit-fullname" type="text" class="input">
        </div>
        <div>
          <label class="label">Plan</label>
          <select id="admin-edit-plan" class="input">
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>
      <div>
        <label class="label">Institución</label>
        <input id="admin-edit-institution" type="text" class="input">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex items-center gap-3">
          <input type="checkbox" id="admin-edit-active" class="w-4 h-4 rounded">
          <label class="label mb-0">Cuenta Activa</label>
        </div>
        <div class="flex items-center gap-3">
          <input type="checkbox" id="admin-edit-admin" class="w-4 h-4 rounded">
          <label class="label mb-0">Es Administrador</label>
        </div>
      </div>
      <div>
        <label class="label">Nueva Contraseña (dejar vacío para no cambiar)</label>
        <input id="admin-edit-pwd" type="password" class="input" placeholder="Nueva contraseña...">
      </div>
      <div class="flex gap-3 pt-2">
        <button onclick="saveAdminUserEdit()" class="btn btn-primary flex-1 justify-center">
          <i class="fas fa-save"></i> Guardar
        </button>
        <button onclick="closeModal('admin-user-modal')" class="btn btn-secondary">Cancelar</button>
      </div>
    </div>
  </div>
</div>

<!-- Toast container -->
<div id="toast-container" class="fixed bottom-6 right-6 z-50 flex flex-col gap-3" style="max-width: 360px;"></div>

<!-- ══════════════════════════ JAVASCRIPT ══════════════════════════════ -->
<script>
// ── Estado Global ────────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('tf_token'),
  user: null,
  projects: [],
  currentProject: null,
  currentChapterNum: null,
  currentPage: 'dashboard',
  confirmCallback: null,
  adminUsers: [],
  searchTimeout: null
}

const API = '/api'

// ── API Helper ───────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(API + path, opts)
  const data = await res.json().catch(() => ({ error: 'Respuesta inválida del servidor' }))
  if (!res.ok) throw new Error(data.error || 'Error ' + res.status)
  return data
}

// ── Toast Notifications ───────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 4000) {
  const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' }
  const el = document.createElement('div')
  el.className = 'toast toast-' + type
  el.innerHTML = '<i class="fas fa-' + icons[type] + '"></i><span>' + msg + '</span>'
  document.getElementById('toast-container').appendChild(el)
  setTimeout(() => el.remove(), duration)
}

// ── Auth ─────────────────────────────────────────────────────────────────────
function showTab(tab) {
  document.getElementById('form-login').classList.toggle('hidden', tab !== 'login')
  document.getElementById('form-register').classList.toggle('hidden', tab !== 'register')
  document.getElementById('tab-login').className = 'flex-1 py-2 rounded-md text-sm font-medium transition-all ' + (tab === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400')
  document.getElementById('tab-register').className = 'flex-1 py-2 rounded-md text-sm font-medium transition-all ' + (tab === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400')
}

function togglePwd(id) {
  const el = document.getElementById(id)
  el.type = el.type === 'password' ? 'text' : 'password'
}

async function doLogin() {
  const username = document.getElementById('login-username').value.trim()
  const password = document.getElementById('login-password').value
  if (!username || !password) return toast('Completa todos los campos', 'error')
  try {
    const data = await api('POST', '/auth/login', { username, password })
    state.token = data.token
    state.user = data.user
    localStorage.setItem('tf_token', data.token)
    initApp()
  } catch (e) { toast(e.message, 'error') }
}

async function doRegister() {
  const body = {
    username: document.getElementById('reg-username').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
    full_name: document.getElementById('reg-fullname').value.trim(),
    institution: document.getElementById('reg-institution').value.trim()
  }
  if (!body.username || !body.email || !body.password || !body.full_name)
    return toast('Completa los campos obligatorios', 'error')
  if (body.password.length < 8) return toast('Contraseña demasiado corta (mín. 8)', 'error')
  try {
    const data = await api('POST', '/auth/register', body)
    state.token = data.token
    state.user = data.user
    localStorage.setItem('tf_token', data.token)
    initApp()
    toast('¡Bienvenido a ThesisForge AI!', 'success')
  } catch (e) { toast(e.message, 'error') }
}

async function doLogout() {
  try { await api('POST', '/auth/logout') } catch {}
  state.token = null; state.user = null
  localStorage.removeItem('tf_token')
  document.getElementById('app').style.display = 'none'
  document.getElementById('auth-screen').style.display = 'flex'
}

// ── App Init ──────────────────────────────────────────────────────────────────
async function initApp() {
  try {
    const me = await api('GET', '/auth/me')
    state.user = me
    document.getElementById('auth-screen').style.display = 'none'
    document.getElementById('app').style.display = 'flex'
    updateSidebar()
    navigate('dashboard')
  } catch {
    localStorage.removeItem('tf_token')
    state.token = null
    document.getElementById('auth-screen').style.display = 'flex'
  }
}

function updateSidebar() {
  const u = state.user
  if (!u) return
  document.getElementById('sidebar-avatar').textContent = (u.full_name || u.username)[0].toUpperCase()
  document.getElementById('sidebar-username').textContent = u.full_name || u.username
  document.getElementById('sidebar-plan').textContent = 'Plan ' + capitalize(u.plan)
  document.getElementById('header-plan-badge').textContent = capitalize(u.plan)
  if (u.is_admin) document.getElementById('nav-admin').classList.remove('hidden')
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

// ── Router ────────────────────────────────────────────────────────────────────
function navigate(page, data = null) {
  state.currentPage = page
  document.querySelectorAll('[id^="nav-"]').forEach(el => el.classList.remove('active'))
  const navEl = document.getElementById('nav-' + page)
  if (navEl) navEl.classList.add('active')
  const titles = {
    'dashboard': 'Dashboard',
    'projects': 'Mis Proyectos',
    'new-project': 'Nuevo Proyecto',
    'project-detail': 'Detalle del Proyecto',
    'profile': 'Mi Perfil',
    'admin': 'Administración'
  }
  document.getElementById('page-title').textContent = titles[page] || page
  const content = document.getElementById('page-content')
  switch (page) {
    case 'dashboard': renderDashboard(); break
    case 'projects': renderProjects(); break
    case 'new-project': renderNewProject(); break
    case 'project-detail': renderProjectDetail(data); break
    case 'profile': renderProfile(); break
    case 'admin': renderAdmin(); break
    default: content.innerHTML = '<p class="text-slate-400">Página no encontrada</p>'
  }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function renderDashboard() {
  const content = document.getElementById('page-content')
  content.innerHTML = '<div class="loading-pulse text-slate-400 p-8"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando...</div>'
  
  try {
    const [me, projData] = await Promise.all([
      api('GET', '/auth/me'),
      api('GET', '/thesis/projects')
    ])
    state.user = me
    state.projects = projData.projects

    const planLimits = { free: 2, basic: 10, premium: 999, admin: 999 }
    const maxProj = planLimits[me.plan] || 2
    const completedProj = state.projects.filter(p => p.status === 'completed').length
    const inProgressProj = state.projects.filter(p => p.status === 'in_progress').length
    const recentProjects = state.projects.slice(0, 5)

    const planColors = { free: 'badge-gray', basic: 'badge-blue', premium: 'badge-purple', admin: 'badge-yellow' }

    content.innerHTML = \`
      <div class="space-y-6">
        <!-- Welcome Banner -->
        <div class="gradient-bg rounded-2xl p-6 text-white">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold mb-1">¡Bienvenido, \${me.full_name || me.username}! 👋</h2>
              <p class="text-indigo-100">Continúa trabajando en tus proyectos de investigación</p>
              <div class="flex items-center gap-2 mt-3">
                <span class="badge \${planColors[me.plan] || 'badge-gray'}">\${capitalize(me.plan)}</span>
                \${me.institution ? '<span class="text-indigo-200 text-sm"><i class="fas fa-university mr-1"></i>' + me.institution + '</span>' : ''}
              </div>
            </div>
            <div class="hidden md:block text-6xl opacity-20"><i class="fas fa-graduation-cap"></i></div>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="stat-card">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                <i class="fas fa-folder text-indigo-400"></i>
              </div>
              <p class="text-slate-400 text-sm">Total Proyectos</p>
            </div>
            <p class="text-3xl font-bold text-white">\${state.projects.length}</p>
            <p class="text-xs text-slate-500 mt-1">de \${maxProj === 999 ? '∞' : maxProj} disponibles</p>
            <div class="progress-bar mt-2">
              <div class="progress-fill" style="width: \${Math.min((state.projects.length / (maxProj === 999 ? state.projects.length || 1 : maxProj)) * 100, 100)}%"></div>
            </div>
          </div>
          <div class="stat-card">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                <i class="fas fa-check-circle text-green-400"></i>
              </div>
              <p class="text-slate-400 text-sm">Completados</p>
            </div>
            <p class="text-3xl font-bold text-white">\${completedProj}</p>
            <p class="text-xs text-slate-500 mt-1">tesis finalizadas</p>
          </div>
          <div class="stat-card">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
                <i class="fas fa-spinner text-yellow-400"></i>
              </div>
              <p class="text-slate-400 text-sm">En Progreso</p>
            </div>
            <p class="text-3xl font-bold text-white">\${inProgressProj}</p>
            <p class="text-xs text-slate-500 mt-1">proyectos activos</p>
          </div>
          <div class="stat-card">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                <i class="fas fa-robot text-cyan-400"></i>
              </div>
              <p class="text-slate-400 text-sm">Capítulos IA</p>
            </div>
            <p class="text-3xl font-bold text-white">\${state.projects.reduce((a, p) => a + Number(p.completed_chapters || 0), 0)}</p>
            <p class="text-xs text-slate-500 mt-1">generados con IA</p>
          </div>
        </div>

        <!-- Proyectos Recientes + CTA -->
        <div class="grid md:grid-cols-3 gap-6">
          <div class="md:col-span-2 card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-white">Proyectos Recientes</h3>
              <button onclick="navigate('projects')" class="text-indigo-400 text-sm hover:text-indigo-300">Ver todos →</button>
            </div>
            \${recentProjects.length === 0 ? 
              '<div class="text-center py-10"><i class="fas fa-folder-open text-4xl text-slate-600 mb-3"></i><p class="text-slate-400">Aún no tienes proyectos</p></div>' :
              '<div class="space-y-3">' + recentProjects.map(p => \`
                <div onclick="navigate('project-detail', \${p.id})" class="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
                  <div class="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-file-alt text-indigo-400 text-sm"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-white text-sm font-medium truncate">\${p.title}</p>
                    <p class="text-slate-400 text-xs">\${p.normative} · \${Number(p.completed_chapters || 0)}/\${Number(p.chapter_count || 5)} capítulos</p>
                  </div>
                  <span class="badge \${statusBadge(p.status)}">\${statusLabel(p.status)}</span>
                </div>
              \`).join('') + '</div>'
            }
          </div>

          <div class="space-y-4">
            <div class="card p-6 text-center border-dashed border-indigo-600/50 hover:border-indigo-500 cursor-pointer transition-all" onclick="navigate('new-project')">
              <div class="w-14 h-14 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i class="fas fa-plus text-white text-xl"></i>
              </div>
              <h3 class="font-semibold text-white mb-1">Nuevo Proyecto</h3>
              <p class="text-slate-400 text-xs">Crea una nueva tesis con IA</p>
            </div>

            <div class="card p-5">
              <h3 class="font-semibold text-white mb-3 text-sm">Normativas Soportadas</h3>
              <div class="space-y-2 text-xs text-slate-400">
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-indigo-400"></span> IUTA (Inst. Universitario de Tecnología)</div>
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-purple-400"></span> IUTAR (Inst. Universitario Tecnológico)</div>
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-cyan-400"></span> PNF (Programa Nacional de Formación)</div>
                <div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-green-400"></span> APA 7 (Norma Internacional)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    \`
  } catch (e) {
    content.innerHTML = '<div class="text-red-400 p-4"><i class="fas fa-exclamation-circle mr-2"></i>' + e.message + '</div>'
  }
}

// ── Projects List ─────────────────────────────────────────────────────────────
async function renderProjects() {
  const content = document.getElementById('page-content')
  content.innerHTML = '<div class="loading-pulse text-slate-400 p-8"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando proyectos...</div>'
  try {
    const data = await api('GET', '/thesis/projects')
    state.projects = data.projects
    if (state.projects.length === 0) {
      content.innerHTML = \`
        <div class="text-center py-20">
          <i class="fas fa-folder-open text-5xl text-slate-600 mb-4"></i>
          <h3 class="text-xl text-slate-300 mb-2">No tienes proyectos aún</h3>
          <p class="text-slate-500 mb-6">Comienza creando tu primera tesis con IA</p>
          <button onclick="navigate('new-project')" class="btn btn-primary btn-lg">
            <i class="fas fa-plus"></i> Crear Primer Proyecto
          </button>
        </div>
      \`
      return
    }
    content.innerHTML = \`
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-white">\${state.projects.length} Proyecto\${state.projects.length !== 1 ? 's' : ''}</h2>
        <button onclick="navigate('new-project')" class="btn btn-primary"><i class="fas fa-plus"></i> Nuevo</button>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        \${state.projects.map(p => \`
          <div class="card card-hover p-5 cursor-pointer" onclick="navigate('project-detail', \${p.id})">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                <i class="fas fa-file-alt text-indigo-400"></i>
              </div>
              <span class="badge \${statusBadge(p.status)}">\${statusLabel(p.status)}</span>
            </div>
            <h3 class="font-semibold text-white text-sm mb-1 line-clamp-2">\${p.title}</h3>
            <p class="text-slate-400 text-xs mb-3">\${p.normative} · \${p.research_type}</p>
            <div class="progress-bar mb-2">
              <div class="progress-fill" style="width: \${(Number(p.completed_chapters || 0) / 5) * 100}%"></div>
            </div>
            <div class="flex items-center justify-between text-xs text-slate-500">
              <span>\${Number(p.completed_chapters || 0)}/5 capítulos</span>
              <span>\${new Date(p.created_at).toLocaleDateString('es-VE')}</span>
            </div>
          </div>
        \`).join('')}
      </div>
    \`
  } catch (e) {
    content.innerHTML = '<div class="text-red-400 p-4">' + e.message + '</div>'
  }
}

// ── New Project Form ───────────────────────────────────────────────────────────
function renderNewProject() {
  const content = document.getElementById('page-content')
  content.innerHTML = \`
    <div class="max-w-3xl mx-auto">
      <div class="card p-8">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center">
            <i class="fas fa-plus text-white text-xl"></i>
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">Nuevo Proyecto de Tesis</h2>
            <p class="text-slate-400 text-sm">Configura tu proyecto y la IA generará los capítulos</p>
          </div>
        </div>

        <div class="space-y-6">
          <!-- Datos básicos -->
          <div>
            <h3 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <i class="fas fa-info-circle text-indigo-400"></i> Información General
            </h3>
            <div class="space-y-4">
              <div>
                <label class="label">Título de la Tesis / Proyecto *</label>
                <input id="np-title" type="text" class="input" placeholder="Ej: Implementación de un Sistema de Gestión para...">
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">Institución</label>
                  <input id="np-institution" type="text" class="input" placeholder="IUTA, IUTAR, UCV...">
                </div>
                <div>
                  <label class="label">Normativa</label>
                  <select id="np-normative" class="input">
                    <option value="APA7">APA 7 (Internacional)</option>
                    <option value="IUTA">IUTA</option>
                    <option value="IUTAR">IUTAR</option>
                    <option value="PNF">PNF</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label">Tipo de Investigación</label>
                  <select id="np-research-type" class="input">
                    <option value="cuantitativa">Cuantitativa</option>
                    <option value="cualitativa">Cualitativa</option>
                    <option value="mixta">Mixta</option>
                    <option value="documental">Documental</option>
                    <option value="descriptiva">Descriptiva</option>
                    <option value="explicativa">Explicativa</option>
                  </select>
                </div>
                <div>
                  <label class="label">Modalidad</label>
                  <input id="np-modality" type="text" class="input" placeholder="Proyecto Factible, Especial de Grado...">
                </div>
              </div>
              <div>
                <label class="label">Palabras Clave</label>
                <input id="np-keywords" type="text" class="input" placeholder="IA, tecnología, gestión, sistemas...">
              </div>
            </div>
          </div>

          <!-- Objetivos -->
          <div>
            <h3 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <i class="fas fa-bullseye text-indigo-400"></i> Objetivos
            </h3>
            <div class="space-y-4">
              <div>
                <label class="label">Objetivo General *</label>
                <textarea id="np-objective" class="input" rows="3" placeholder="Desarrollar / Diseñar / Implementar... un sistema que permita..."></textarea>
              </div>
              <div>
                <label class="label">Objetivos Específicos (uno por línea)</label>
                <textarea id="np-specific" class="input" rows="4" placeholder="1. Diagnosticar la situación actual...&#10;2. Diseñar la estructura del sistema...&#10;3. Implementar las funcionalidades...&#10;4. Evaluar los resultados..."></textarea>
              </div>
              <div>
                <label class="label">Justificación</label>
                <textarea id="np-justification" class="input" rows="3" placeholder="La presente investigación se justifica porque..."></textarea>
              </div>
            </div>
          </div>

          <!-- Configuración IA -->
          <div>
            <h3 class="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <i class="fas fa-robot text-indigo-400"></i> Configuración de IA
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              \${[
                { id: 'gemini', icon: 'fa-gem', name: 'Gemini', model: 'gemini-1.5-flash', color: 'text-blue-400' },
                { id: 'groq', icon: 'fa-bolt', name: 'Groq', model: 'llama-3.1-70b-versatile', color: 'text-yellow-400' },
                { id: 'openrouter', icon: 'fa-route', name: 'OpenRouter', model: 'meta-llama/llama-3.1-70b-instruct', color: 'text-green-400' },
                { id: 'cohere', icon: 'fa-wave-square', name: 'Cohere', model: 'command-r-plus', color: 'text-purple-400' }
              ].map(p => \`
                <div class="ai-provider-btn \${p.id === 'gemini' ? 'selected' : ''}" onclick="selectProvider('\${p.id}', '\${p.model}')" data-provider="\${p.id}">
                  <i class="fas \${p.icon} \${p.color} text-xl mb-2"></i>
                  <p class="text-sm font-medium text-white">\${p.name}</p>
                  <p class="text-xs text-slate-400 truncate">\${p.model}</p>
                </div>
              \`).join('')}
            </div>
            <input type="hidden" id="np-provider" value="gemini">
            <input type="hidden" id="np-model" value="gemini-1.5-flash">
          </div>

          <div class="flex gap-4 pt-2">
            <button onclick="createProject()" class="btn btn-primary btn-lg flex-1 justify-center">
              <i class="fas fa-rocket"></i> Crear Proyecto
            </button>
            <button onclick="navigate('projects')" class="btn btn-secondary btn-lg">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  \`
}

function selectProvider(provider, model) {
  document.getElementById('np-provider').value = provider
  document.getElementById('np-model').value = model
  document.querySelectorAll('.ai-provider-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.provider === provider)
  })
}

async function createProject() {
  const title = document.getElementById('np-title').value.trim()
  const objective = document.getElementById('np-objective').value.trim()
  if (!title || title.length < 10) return toast('El título debe tener al menos 10 caracteres', 'error')
  if (!objective) return toast('El objetivo general es requerido', 'error')

  const body = {
    title, institution: document.getElementById('np-institution').value.trim(),
    normative: document.getElementById('np-normative').value,
    research_type: document.getElementById('np-research-type').value,
    modality: document.getElementById('np-modality').value.trim(),
    general_objective: objective,
    specific_objectives: document.getElementById('np-specific').value.trim(),
    justification: document.getElementById('np-justification').value.trim(),
    keywords: document.getElementById('np-keywords').value.trim(),
    ai_provider: document.getElementById('np-provider').value,
    ai_model: document.getElementById('np-model').value
  }

  try {
    const data = await api('POST', '/thesis/projects', body)
    toast('¡Proyecto creado exitosamente!', 'success')
    navigate('project-detail', data.project.id)
  } catch (e) { toast(e.message, 'error') }
}

// ── Project Detail ────────────────────────────────────────────────────────────
async function renderProjectDetail(projectId) {
  const content = document.getElementById('page-content')
  content.innerHTML = '<div class="loading-pulse text-slate-400 p-8"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando proyecto...</div>'
  try {
    const data = await api('GET', '/thesis/projects/' + projectId)
    state.currentProject = data.project
    const p = data.project
    const chapters = data.chapters || []
    const citations = data.citations || []
    const totalWords = chapters.reduce((a, c) => a + Number(c.word_count || 0), 0)

    document.getElementById('page-title').textContent = p.title.substring(0, 50) + (p.title.length > 50 ? '...' : '')

    content.innerHTML = \`
      <div class="space-y-6">
        <!-- Header del Proyecto -->
        <div class="card p-6">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <span class="badge \${statusBadge(p.status)}">\${statusLabel(p.status)}</span>
                <span class="badge badge-blue">\${p.normative}</span>
                <span class="badge badge-gray">\${p.ai_provider}</span>
              </div>
              <h2 class="text-xl font-bold text-white mb-1">\${p.title}</h2>
              \${p.institution ? '<p class="text-slate-400 text-sm"><i class="fas fa-university mr-1"></i>' + p.institution + '</p>' : ''}
              <p class="text-slate-400 text-sm mt-1">
                <i class="fas fa-flask mr-1"></i>\${p.research_type}
                \${p.modality ? ' · ' + p.modality : ''}
              </p>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button onclick="searchCitations(\${p.id})" class="btn btn-secondary btn-sm">
                <i class="fas fa-search"></i> Buscar Citas
              </button>
              <button onclick="showCitationModal(\${p.id})" class="btn btn-secondary btn-sm">
                <i class="fas fa-plus"></i> Cita Manual
              </button>
              <a href="/api/thesis/projects/\${p.id}/export/html" target="_blank" class="btn btn-success btn-sm">
                <i class="fas fa-download"></i> Exportar HTML
              </a>
              <button onclick="confirmDelete('¿Eliminar este proyecto?', 'Se eliminarán todos los capítulos y citas.', () => deleteProject(\${p.id}))" class="btn btn-danger btn-sm">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <!-- Stats del proyecto -->
          <div class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700">
            <div class="text-center">
              <p class="text-2xl font-bold text-white">\${chapters.filter(c => c.status === 'completed').length}/5</p>
              <p class="text-xs text-slate-400">Capítulos</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-white">\${totalWords.toLocaleString()}</p>
              <p class="text-xs text-slate-400">Palabras</p>
            </div>
            <div class="text-center">
              <p class="text-2xl font-bold text-white">\${citations.length}</p>
              <p class="text-xs text-slate-400">Referencias</p>
            </div>
          </div>
          
          <!-- Progreso -->
          <div class="mt-4">
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progreso total</span>
              <span>\${Math.round((chapters.filter(c => c.status === 'completed').length / 5) * 100)}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: \${(chapters.filter(c => c.status === 'completed').length / 5) * 100}%"></div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 border-b border-slate-700 pb-0">
          <div class="nav-tab active" onclick="showProjectTab('chapters', this)">
            <i class="fas fa-book mr-1"></i> Capítulos
          </div>
          <div class="nav-tab" onclick="showProjectTab('objective', this)">
            <i class="fas fa-bullseye mr-1"></i> Objetivos
          </div>
          <div class="nav-tab" onclick="showProjectTab('citations', this)">
            <i class="fas fa-quote-right mr-1"></i> Referencias (\${citations.length})
          </div>
        </div>

        <!-- Tab: Capítulos -->
        <div id="tab-chapters">
          <div class="grid md:grid-cols-1 gap-3">
            \${chapters.map(ch => \`
              <div class="chapter-card \${ch.status}" id="ch-card-\${ch.chapter_number}">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg \${ch.status === 'completed' ? 'bg-green-600/20' : ch.status === 'error' ? 'bg-red-600/20' : 'bg-slate-700'} flex items-center justify-center text-xs font-bold \${ch.status === 'completed' ? 'text-green-400' : ch.status === 'error' ? 'text-red-400' : 'text-slate-400'}">
                      \${ch.status === 'completed' ? '<i class="fas fa-check"></i>' : ch.chapter_number}
                    </div>
                    <div>
                      <p class="font-medium text-white text-sm">Capítulo \${ch.chapter_number}: \${ch.title}</p>
                      <p class="text-xs text-slate-400">
                        \${ch.status === 'completed' ? (ch.word_count || 0).toLocaleString() + ' palabras · ' + new Date(ch.generated_at || ch.updated_at).toLocaleDateString('es-VE') : ch.status === 'generating' ? 'Generando...' : ch.status === 'error' ? 'Error al generar' : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                  <div class="flex gap-2" id="ch-actions-\${ch.chapter_number}">
                    \${ch.status === 'completed' ? \`
                      <button onclick="viewChapter(\${p.id}, \${ch.chapter_number}, '\${escapeHtml(ch.title)}')" class="btn btn-secondary btn-sm">
                        <i class="fas fa-eye"></i> Ver
                      </button>
                      <button onclick="generateChapter(\${p.id}, \${ch.chapter_number})" class="btn btn-secondary btn-sm" title="Regenerar">
                        <i class="fas fa-redo"></i>
                      </button>
                    \` : ch.status === 'generating' ? \`
                      <button class="btn btn-warning btn-sm" disabled>
                        <span class="spinner"></span> Generando...
                      </button>
                    \` : \`
                      <button onclick="generateChapter(\${p.id}, \${ch.chapter_number})" class="btn btn-primary btn-sm">
                        <i class="fas fa-magic"></i> Generar con IA
                      </button>
                    \`}
                  </div>
                </div>
              </div>
            \`).join('')}
            
            <!-- Botón generar todos -->
            <div class="pt-2">
              <button onclick="generateAllChapters(\${p.id})" class="btn btn-primary w-full justify-center">
                <i class="fas fa-magic"></i> Generar Todos los Capítulos
              </button>
            </div>
          </div>
        </div>

        <!-- Tab: Objetivos -->
        <div id="tab-objective" class="hidden card p-6">
          <div class="space-y-4">
            <div>
              <h3 class="font-semibold text-white mb-2">Objetivo General</h3>
              <p class="text-slate-300 text-sm leading-relaxed">\${p.general_objective || 'No especificado'}</p>
            </div>
            \${p.specific_objectives ? \`
              <div>
                <h3 class="font-semibold text-white mb-2">Objetivos Específicos</h3>
                <div class="space-y-1">\${p.specific_objectives.split('\\n').filter(l => l.trim()).map(l => '<p class="text-slate-300 text-sm">• ' + l.trim() + '</p>').join('')}</div>
              </div>
            \` : ''}
            \${p.justification ? \`
              <div>
                <h3 class="font-semibold text-white mb-2">Justificación</h3>
                <p class="text-slate-300 text-sm leading-relaxed">\${p.justification}</p>
              </div>
            \` : ''}
            \${p.keywords ? '<div><h3 class="font-semibold text-white mb-2">Palabras Clave</h3><p class="text-slate-300 text-sm">' + p.keywords + '</p></div>' : ''}
          </div>
        </div>

        <!-- Tab: Referencias -->
        <div id="tab-citations" class="hidden">
          <div id="citations-list">
            \${citations.length === 0 ? 
              '<div class="card p-8 text-center"><i class="fas fa-book-open text-3xl text-slate-600 mb-3"></i><p class="text-slate-400">No hay referencias bibliográficas aún</p></div>' :
              '<div class="space-y-2">' + citations.map(c => \`
                <div class="card p-4 flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <p class="text-white text-sm font-medium">\${c.authors} (\${c.year || 's.f.'}).</p>
                    <p class="text-slate-300 text-sm">\${c.title}</p>
                    \${c.apa_format ? '<p class="text-slate-400 text-xs mt-1">' + c.apa_format + '</p>' : ''}
                  </div>
                  <button onclick="deleteCitation(\${p.id}, \${c.id})" class="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              \`).join('') + '</div>'
            }
          </div>
        </div>
      </div>
    \`
  } catch (e) {
    content.innerHTML = '<div class="text-red-400 p-4"><i class="fas fa-exclamation-circle mr-2"></i>' + e.message + '</div>'
  }
}

function showProjectTab(tab, el) {
  document.querySelectorAll('#tab-chapters, #tab-objective, #tab-citations').forEach(t => t.classList.add('hidden'))
  document.getElementById('tab-' + tab).classList.remove('hidden')
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'))
  if (el) el.classList.add('active')
}

// ── Generate Chapter ──────────────────────────────────────────────────────────
async function generateChapter(projectId, chapterNum) {
  const card = document.getElementById('ch-card-' + chapterNum)
  const actions = document.getElementById('ch-actions-' + chapterNum)
  
  if (card) {
    card.className = 'chapter-card generating'
    actions.innerHTML = '<button class="btn btn-warning btn-sm" disabled><span class="spinner"></span> Generando...</button>'
  }
  
  try {
    const data = await api('POST', '/thesis/projects/' + projectId + '/generate/' + chapterNum)
    toast('Capítulo ' + chapterNum + ' generado: ' + data.chapter.word_count + ' palabras', 'success')
    renderProjectDetail(projectId)
  } catch (e) {
    if (card) {
      card.className = 'chapter-card error'
      actions.innerHTML = '<button onclick="generateChapter(' + projectId + ', ' + chapterNum + ')" class="btn btn-danger btn-sm"><i class="fas fa-redo"></i> Reintentar</button>'
    }
    toast('Error al generar capítulo ' + chapterNum + ': ' + e.message, 'error', 8000)
  }
}

async function generateAllChapters(projectId) {
  toast('Iniciando generación secuencial de todos los capítulos...', 'info', 5000)
  for (let i = 1; i <= 5; i++) {
    const card = document.getElementById('ch-card-' + i)
    if (card && card.classList.contains('completed')) continue
    await generateChapter(projectId, i)
    await new Promise(r => setTimeout(r, 1500))
  }
}

// ── View/Edit Chapter ─────────────────────────────────────────────────────────
async function viewChapter(projectId, chapterNum, title) {
  state.currentChapterNum = chapterNum
  document.getElementById('chapter-modal-title').textContent = title
  document.getElementById('chapter-content-view').textContent = 'Cargando...'
  document.getElementById('chapter-modal').classList.remove('hidden')
  
  try {
    const data = await api('GET', '/thesis/projects/' + projectId + '/chapters/' + chapterNum)
    const content = data.chapter.content || ''
    document.getElementById('chapter-content-view').textContent = content
    document.getElementById('chapter-content-edit').value = content
    document.getElementById('chapter-word-count').textContent = content.split(/\\s+/).filter(Boolean).length + ' palabras'
  } catch (e) {
    document.getElementById('chapter-content-view').textContent = 'Error al cargar: ' + e.message
  }
}

function toggleChapterEdit() {
  const view = document.getElementById('chapter-content-view')
  const edit = document.getElementById('chapter-content-edit')
  const btnEdit = document.getElementById('btn-edit-chapter')
  const btnSave = document.getElementById('btn-save-chapter')
  
  if (view.classList.contains('hidden')) {
    view.classList.remove('hidden'); edit.classList.add('hidden')
    btnEdit.classList.remove('hidden'); btnSave.classList.add('hidden')
    view.textContent = edit.value
  } else {
    view.classList.add('hidden'); edit.classList.remove('hidden')
    btnEdit.classList.add('hidden'); btnSave.classList.remove('hidden')
    edit.focus()
  }
}

function countChapterWords() {
  const content = document.getElementById('chapter-content-edit').value
  document.getElementById('chapter-word-count').textContent = content.split(/\\s+/).filter(Boolean).length + ' palabras'
}

async function saveChapterEdit() {
  if (!state.currentProject || !state.currentChapterNum) return
  const content = document.getElementById('chapter-content-edit').value
  try {
    await api('PUT', '/thesis/projects/' + state.currentProject.id + '/chapters/' + state.currentChapterNum, { content })
    toast('Capítulo guardado', 'success')
    toggleChapterEdit()
  } catch (e) { toast(e.message, 'error') }
}

function copyChapterContent() {
  const content = document.getElementById('chapter-content-edit').classList.contains('hidden')
    ? document.getElementById('chapter-content-view').textContent
    : document.getElementById('chapter-content-edit').value
  navigator.clipboard.writeText(content).then(() => toast('Contenido copiado al portapapeles', 'success'))
}

// ── Citations ─────────────────────────────────────────────────────────────────
let _citationProjectId = null

function showCitationModal(projectId) {
  _citationProjectId = projectId
  document.getElementById('citation-modal').classList.remove('hidden')
}

async function saveCitation() {
  if (!_citationProjectId) return
  const body = {
    authors: document.getElementById('cit-authors').value.trim(),
    title: document.getElementById('cit-title').value.trim(),
    year: parseInt(document.getElementById('cit-year').value) || null,
    source: document.getElementById('cit-source').value.trim(),
    url: document.getElementById('cit-url').value.trim(),
    doi: document.getElementById('cit-doi').value.trim(),
    citation_type: document.getElementById('cit-type').value,
    apa_format: document.getElementById('cit-apa').value.trim()
  }
  if (!body.authors || !body.title) return toast('Autores y título son requeridos', 'error')
  try {
    await api('POST', '/thesis/projects/' + _citationProjectId + '/citations', body)
    toast('Referencia agregada correctamente', 'success')
    closeModal('citation-modal')
    renderProjectDetail(_citationProjectId)
  } catch (e) { toast(e.message, 'error') }
}

async function deleteCitation(projectId, citationId) {
  try {
    await api('DELETE', '/thesis/projects/' + projectId + '/citations/' + citationId)
    toast('Referencia eliminada', 'success')
    renderProjectDetail(projectId)
  } catch (e) { toast(e.message, 'error') }
}

async function searchCitations(projectId) {
  const query = prompt('¿Sobre qué tema deseas buscar referencias académicas?')
  if (!query || query.trim().length < 3) return
  
  toast('Buscando referencias académicas con IA...', 'info', 6000)
  try {
    const data = await api('POST', '/thesis/search-citations', { query, project_id: projectId })
    if (!data.citations || data.citations.length === 0) {
      return toast('No se encontraron referencias para ese tema', 'error')
    }
    
    // Mostrar resultados en un diálogo simple
    const items = data.citations.map((c, i) => \`\${i+1}. \${c.authors || ''} (\${c.year || 's.f.'}). \${c.title}\`).join('\\n')
    const selected = confirm(\`Se encontraron \${data.citations.length} referencias:\\n\\n\${items}\\n\\n¿Agregar todas al proyecto?\`)
    
    if (selected) {
      for (const c of data.citations) {
        try { await api('POST', '/thesis/projects/' + projectId + '/citations', c) } catch {}
      }
      toast(data.citations.length + ' referencias agregadas al proyecto', 'success')
      renderProjectDetail(projectId)
    }
  } catch (e) { toast(e.message, 'error') }
}

// ── Delete Project ────────────────────────────────────────────────────────────
async function deleteProject(projectId) {
  try {
    await api('DELETE', '/thesis/projects/' + projectId)
    toast('Proyecto eliminado', 'success')
    navigate('projects')
  } catch (e) { toast(e.message, 'error') }
}

// ── Profile ───────────────────────────────────────────────────────────────────
function renderProfile() {
  const content = document.getElementById('page-content')
  const u = state.user
  if (!u) return

  const planColors = { free: 'badge-gray', basic: 'badge-blue', premium: 'badge-purple', admin: 'badge-yellow' }
  const planFeatures = {
    free: ['2 proyectos', '5 capítulos por proyecto', 'IA básica'],
    basic: ['10 proyectos', 'Capítulos ilimitados', 'IA avanzada', 'Exportación HTML'],
    premium: ['Proyectos ilimitados', 'Acceso prioritario IA', 'Todas las normativas', 'Soporte premium'],
    admin: ['Acceso completo', 'Panel de administración', 'Usuarios ilimitados']
  }

  content.innerHTML = \`
    <div class="max-w-2xl mx-auto space-y-6">
      <!-- Tarjeta de perfil -->
      <div class="card p-6">
        <div class="flex items-center gap-4 mb-6">
          <div class="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center text-2xl font-bold text-white">
            \${(u.full_name || u.username)[0].toUpperCase()}
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">\${u.full_name}</h2>
            <p class="text-slate-400">@\${u.username} · \${u.email}</p>
            <div class="flex gap-2 mt-2">
              <span class="badge \${planColors[u.plan] || 'badge-gray'}">\${capitalize(u.plan)}</span>
              \${u.is_admin ? '<span class="badge badge-yellow"><i class="fas fa-shield-alt mr-1"></i>Admin</span>' : ''}
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-slate-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-white">\${u.stats?.total_projects || 0}</p>
            <p class="text-xs text-slate-400">Proyectos Totales</p>
          </div>
          <div class="bg-slate-800 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-white">\${u.stats?.completed_projects || 0}</p>
            <p class="text-xs text-slate-400">Tesis Completadas</p>
          </div>
        </div>

        <button onclick="openProfileModal()" class="btn btn-primary w-full justify-center">
          <i class="fas fa-edit"></i> Editar Perfil
        </button>
      </div>

      <!-- Plan actual -->
      <div class="card p-6">
        <h3 class="font-semibold text-white mb-4">Plan Actual: \${capitalize(u.plan)}</h3>
        <div class="space-y-2">
          \${(planFeatures[u.plan] || planFeatures.free).map(f => \`
            <div class="flex items-center gap-2 text-sm">
              <i class="fas fa-check-circle text-green-400"></i>
              <span class="text-slate-300">\${f}</span>
            </div>
          \`).join('')}
        </div>
        \${u.plan !== 'premium' && !u.is_admin ? \`
          <div class="mt-4 p-4 bg-indigo-600/10 rounded-lg border border-indigo-600/30">
            <p class="text-indigo-300 text-sm font-medium mb-1">¿Necesitas más capacidad?</p>
            <p class="text-slate-400 text-xs">Contacta al administrador para actualizar tu plan.</p>
          </div>
        \` : ''}
      </div>
    </div>
  \`
}

function openProfileModal() {
  const u = state.user
  document.getElementById('prof-fullname').value = u.full_name || ''
  document.getElementById('prof-institution').value = u.institution || ''
  document.getElementById('prof-current-pwd').value = ''
  document.getElementById('prof-new-pwd').value = ''
  document.getElementById('profile-modal').classList.remove('hidden')
}

async function saveProfile() {
  const body = {
    full_name: document.getElementById('prof-fullname').value.trim(),
    institution: document.getElementById('prof-institution').value.trim(),
    current_password: document.getElementById('prof-current-pwd').value,
    new_password: document.getElementById('prof-new-pwd').value
  }
  if (!body.full_name) return toast('El nombre completo es requerido', 'error')
  try {
    await api('PUT', '/auth/profile', body)
    toast('Perfil actualizado correctamente', 'success')
    closeModal('profile-modal')
    const me = await api('GET', '/auth/me')
    state.user = me
    updateSidebar()
  } catch (e) { toast(e.message, 'error') }
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
async function renderAdmin() {
  const content = document.getElementById('page-content')
  if (!state.user?.is_admin) {
    content.innerHTML = '<div class="text-red-400 p-8 text-center"><i class="fas fa-lock text-4xl mb-4"></i><p>Acceso denegado</p></div>'
    return
  }

  content.innerHTML = '<div class="loading-pulse text-slate-400 p-8"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando panel admin...</div>'

  try {
    const stats = await api('GET', '/admin/stats')
    const usersData = await api('GET', '/admin/users?limit=50')
    state.adminUsers = usersData.users

    content.innerHTML = \`
      <div class="space-y-6">
        <!-- Stats Row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="stat-card text-center">
            <p class="text-3xl font-bold text-white">\${stats.users.total_users}</p>
            <p class="text-xs text-slate-400 mt-1">Usuarios Totales</p>
          </div>
          <div class="stat-card text-center">
            <p class="text-3xl font-bold text-white">\${stats.users.active_users}</p>
            <p class="text-xs text-slate-400 mt-1">Usuarios Activos</p>
          </div>
          <div class="stat-card text-center">
            <p class="text-3xl font-bold text-white">\${stats.projects.total_projects}</p>
            <p class="text-xs text-slate-400 mt-1">Proyectos Totales</p>
          </div>
          <div class="stat-card text-center">
            <p class="text-3xl font-bold text-white">\${stats.projects.completed_projects}</p>
            <p class="text-xs text-slate-400 mt-1">Proyectos Completados</p>
          </div>
        </div>

        <!-- Plan Distribution -->
        <div class="card p-6">
          <h3 class="font-semibold text-white mb-4">Distribución por Plan</h3>
          <div class="grid grid-cols-4 gap-3">
            \${[
              { plan: 'Free', count: stats.users.free_users, badge: 'badge-gray' },
              { plan: 'Basic', count: stats.users.basic_users, badge: 'badge-blue' },
              { plan: 'Premium', count: stats.users.premium_users, badge: 'badge-purple' },
              { plan: 'Admin', count: stats.users.admin_users, badge: 'badge-yellow' }
            ].map(p => \`
              <div class="bg-slate-800 rounded-lg p-4 text-center">
                <span class="badge \${p.badge} mb-2">\${p.plan}</span>
                <p class="text-2xl font-bold text-white">\${p.count}</p>
              </div>
            \`).join('')}
          </div>
        </div>

        <!-- Users Table -->
        <div class="card">
          <div class="flex items-center justify-between p-5 border-b border-slate-700">
            <h3 class="font-semibold text-white">Usuarios del Sistema</h3>
            <div class="flex gap-3">
              <input type="text" class="input text-sm" style="width: 200px;" placeholder="Buscar usuario..." 
                onkeyup="filterAdminUsers(this.value)">
              <button onclick="showCreateUserModal()" class="btn btn-primary btn-sm">
                <i class="fas fa-plus"></i> Nuevo
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-slate-400 text-xs border-b border-slate-700">
                  <th class="text-left p-4">Usuario</th>
                  <th class="text-left p-4">Email</th>
                  <th class="text-left p-4">Plan</th>
                  <th class="text-left p-4">Estado</th>
                  <th class="text-left p-4">Proyectos</th>
                  <th class="text-left p-4">Registro</th>
                  <th class="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody id="admin-users-tbody">
                \${renderUsersRows(state.adminUsers)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    \`
  } catch (e) {
    content.innerHTML = '<div class="text-red-400 p-4">' + e.message + '</div>'
  }
}

function renderUsersRows(users) {
  return users.map(u => \`
    <tr class="table-row">
      <td class="p-4">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            \${u.username[0].toUpperCase()}
          </div>
          <div>
            <p class="font-medium text-white">\${u.full_name}</p>
            <p class="text-xs text-slate-400">@\${u.username}</p>
          </div>
        </div>
      </td>
      <td class="p-4 text-slate-300">\${u.email}</td>
      <td class="p-4"><span class="badge \${u.is_admin ? 'badge-yellow' : u.plan === 'premium' ? 'badge-purple' : u.plan === 'basic' ? 'badge-blue' : 'badge-gray'}">\${capitalize(u.plan)}</span></td>
      <td class="p-4"><span class="badge \${u.is_active ? 'badge-green' : 'badge-red'}">\${u.is_active ? 'Activo' : 'Inactivo'}</span></td>
      <td class="p-4 text-slate-300">\${u.project_count || 0}</td>
      <td class="p-4 text-slate-400">\${new Date(u.created_at).toLocaleDateString('es-VE')}</td>
      <td class="p-4">
        <div class="flex gap-1">
          <button onclick="editAdminUser(\${u.id})" class="btn btn-secondary btn-sm" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="confirmDelete('¿Eliminar usuario?', 'Se eliminarán todos sus proyectos.', () => deleteAdminUser(\${u.id}))" class="btn btn-danger btn-sm" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  \`).join('')
}

function filterAdminUsers(query) {
  const filtered = state.adminUsers.filter(u =>
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase()) ||
    u.full_name.toLowerCase().includes(query.toLowerCase())
  )
  document.getElementById('admin-users-tbody').innerHTML = renderUsersRows(filtered)
}

function editAdminUser(userId) {
  const u = state.adminUsers.find(u => u.id === userId)
  if (!u) return
  document.getElementById('admin-edit-user-id').value = userId
  document.getElementById('admin-edit-fullname').value = u.full_name
  document.getElementById('admin-edit-institution').value = u.institution || ''
  document.getElementById('admin-edit-plan').value = u.plan
  document.getElementById('admin-edit-active').checked = u.is_active
  document.getElementById('admin-edit-admin').checked = u.is_admin
  document.getElementById('admin-edit-pwd').value = ''
  document.getElementById('admin-user-modal').classList.remove('hidden')
}

async function saveAdminUserEdit() {
  const id = document.getElementById('admin-edit-user-id').value
  const body = {
    full_name: document.getElementById('admin-edit-fullname').value.trim(),
    institution: document.getElementById('admin-edit-institution').value.trim(),
    plan: document.getElementById('admin-edit-plan').value,
    is_active: document.getElementById('admin-edit-active').checked,
    is_admin: document.getElementById('admin-edit-admin').checked,
    new_password: document.getElementById('admin-edit-pwd').value
  }
  try {
    await api('PUT', '/admin/users/' + id, body)
    toast('Usuario actualizado', 'success')
    closeModal('admin-user-modal')
    renderAdmin()
  } catch (e) { toast(e.message, 'error') }
}

async function deleteAdminUser(userId) {
  try {
    await api('DELETE', '/admin/users/' + userId)
    toast('Usuario eliminado', 'success')
    renderAdmin()
  } catch (e) { toast(e.message, 'error') }
}

function showCreateUserModal() {
  // Reuse admin modal with empty fields
  document.getElementById('admin-edit-user-id').value = 'new'
  document.getElementById('admin-edit-fullname').value = ''
  document.getElementById('admin-edit-institution').value = ''
  document.getElementById('admin-edit-plan').value = 'free'
  document.getElementById('admin-edit-active').checked = true
  document.getElementById('admin-edit-admin').checked = false
  document.getElementById('admin-edit-pwd').value = ''
  document.getElementById('admin-user-modal').querySelector('h3').textContent = 'Crear Usuario'
  document.getElementById('admin-user-modal').classList.remove('hidden')
}

// ── Modales Utilitarios ───────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.add('hidden')
}

function confirmDelete(title, message, callback) {
  document.getElementById('confirm-title').textContent = title
  document.getElementById('confirm-message').textContent = message
  state.confirmCallback = callback
  document.getElementById('confirm-modal').classList.remove('hidden')
}

function executeConfirm() {
  closeModal('confirm-modal')
  if (state.confirmCallback) {
    state.confirmCallback()
    state.confirmCallback = null
  }
}

// ── Utilidades ────────────────────────────────────────────────────────────────
function statusBadge(status) {
  const map = { completed: 'badge-green', in_progress: 'badge-yellow', draft: 'badge-gray' }
  return map[status] || 'badge-gray'
}

function statusLabel(status) {
  const map = { completed: 'Completado', in_progress: 'En Progreso', draft: 'Borrador' }
  return map[status] || status
}

function escapeHtml(s) {
  return String(s).replace(/'/g, "\\'").replace(/"/g, '\\"')
}

// Cerrar modales con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'))
  }
})

// Cerrar modales al hacer click fuera
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden')
  })
})

// ── Inicialización ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Permitir Enter en campos de login
  document.getElementById('login-password').addEventListener('keypress', e => {
    if (e.key === 'Enter') doLogin()
  })
  document.getElementById('login-username').addEventListener('keypress', e => {
    if (e.key === 'Enter') doLogin()
  })

  if (state.token) {
    initApp()
  }
})
</script>
</body>
</html>`
}
