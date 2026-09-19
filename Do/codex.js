document.addEventListener("DOMContentLoaded", () => {
  const buscador = document.querySelector("#buscador");
  const heroResults = document.querySelector("#hero-results");
  const heroResultsList = document.querySelector("#hero-results-list");
  const heroResultsEmpty = document.querySelector("#hero-results-empty");
  const languageGrid = document.querySelector("#language-grid");
  const categoryModal = document.querySelector("#category-modal");
  const categoryModalTitle = document.querySelector("#category-modal-title");
  const categoryModalList = document.querySelector("#category-modal-list");
  const categoryModalEmpty = document.querySelector("#category-modal-empty");
  const codeList = document.querySelector("#code-list");
  const favoritesList = document.querySelector("#favorites-list");
  const favoritesEmpty = document.querySelector("#favorites-empty");
  const emptyState = document.querySelector("#empty-state");
  const status = document.querySelector("#data-status");
  const termForm = document.querySelector("#term-form");
  const importFile = document.querySelector("#import-file");
  let dictionary = [];
  let favoritos = new Set(JSON.parse(localStorage.getItem("codex-favorites") || "[]"));
  let categoriaActiva = "";

  const normalizar = (valor = "") => valor
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const escapeHtml = (valor) => String(valor).replace(/[&<>'"]/g, (caracter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[caracter]));

  function guardarLocalmente() {
    localStorage.setItem("codex-dictionary", JSON.stringify(dictionary));
  }

  function clave(item) {
    return `${item.category}::${item.term}`;
  }

  function guardarPreferencias() {
    localStorage.setItem("codex-favorites", JSON.stringify([...favoritos]));
  }

  function buscarTerminos(texto) {
    const consulta = normalizar(texto.trim());
    return dictionary.filter((item) => normalizar(
      `${item.term} ${item.definition} ${item.category} ${(item.tags || []).join(" ")}`
    ).includes(consulta));
  }

  function mostrarItem(item) {
    const indice = dictionary.indexOf(item);
    const esFavorito = favoritos.has(clave(item));
    const lenguaje = item.language || item.category.toLowerCase();
    const tags = (item.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    return `<article class="code-item">
      <div class="code-info"><div class="code-language">${escapeHtml(item.category)}</div>
      <div class="term-content"><div class="term-heading"><h3>${escapeHtml(item.term)}</h3>
      <button class="favorite-button ${esFavorito ? "is-favorite" : ""}" type="button" data-favorite="${indice}" aria-label="${esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}">${esFavorito ? "★" : "☆"}</button></div>
      <p>${escapeHtml(item.definition)}</p><div class="tags">${tags}</div>
      <div class="snippet-heading"><span>Ejemplo</span><button class="copy-button" type="button" data-copy="${indice}">Copiar código</button></div>
      <pre><code class="language-${escapeHtml(lenguaje)}">${escapeHtml(item.code || "")}</code></pre></div></div>
    </article>`;
  }

  function renderizar() {
    const encontrados = buscarTerminos(buscador?.value || "");
    const categorias = [...new Set(dictionary.map((item) => item.category))];

    languageGrid.innerHTML = categorias.map((category) => {
      const total = dictionary.filter((item) => item.category === category).length;
      return `<article class="language-card" data-category="${escapeHtml(category)}" tabindex="0" role="button" aria-label="Ver términos de ${escapeHtml(category)}">
        <div class="language-top"><div class="language-logo">${escapeHtml(category.slice(0, 3).toUpperCase())}</div><span class="arrow">↗</span></div>
        <h3>${escapeHtml(category)}</h3><p>Conceptos, funciones y ejemplos de ${escapeHtml(category)}.</p>
        <div class="language-footer"><span>${total} términos</span></div>
      </article>`;
    }).join("");

    codeList.innerHTML = encontrados.map(mostrarItem).join("");
    const favoritosEncontrados = encontrados.filter((item) => favoritos.has(clave(item)));
    favoritesList.innerHTML = favoritosEncontrados.map(mostrarItem).join("");
    favoritesEmpty.hidden = favoritosEncontrados.length > 0;
    emptyState.hidden = encontrados.length > 0;
    window.Prism?.highlightAllUnder(codeList);
    window.Prism?.highlightAllUnder(favoritesList);
  }

  function renderizarCategoria() {
    const encontrados = dictionary.filter((item) => normalizar(item.category) === normalizar(categoriaActiva));
    categoryModalTitle.textContent = categoriaActiva;
    categoryModalList.innerHTML = encontrados.map(mostrarItem).join("");
    categoryModalEmpty.hidden = encontrados.length > 0;
    window.Prism?.highlightAllUnder(categoryModalList);
  }

  function abrirCategoria(categoria) {
    categoriaActiva = categoria;
    categoryModal.hidden = false;
    document.body.classList.add("modal-open");
    renderizarCategoria();
  }

  function cerrarCategoria() {
    categoryModal.hidden = true;
    categoryModalList.innerHTML = "";
    categoriaActiva = "";
    document.body.classList.remove("modal-open");
  }

  function mostrarResultadosHero() {
    const consulta = buscador?.value.trim() || "";
    if (!consulta) {
      cerrarResultados();
      return;
    }

    const encontrados = buscarTerminos(consulta);
    heroResults.hidden = false;
    heroResultsList.innerHTML = encontrados.map(mostrarItem).join("");
    heroResultsEmpty.hidden = encontrados.length > 0;
    heroResultsEmpty.textContent = encontrados.length
      ? ""
      : `No se encontraron resultados para '${consulta}'.`;
    window.Prism?.highlightAllUnder(heroResultsList);
  }

  function cerrarResultados() {
    heroResults.hidden = true;
    heroResultsList.innerHTML = "";
    heroResultsEmpty.hidden = true;
    heroResultsEmpty.textContent = "";
    if (buscador) buscador.value = "";
    renderizar();
  }

  async function cargarDiccionario() {
    try {
      const respuesta = await fetch("dictionary.json", { cache: "no-store" });
      if (!respuesta.ok) throw new Error("No se pudo cargar dictionary.json");
      dictionary = await respuesta.json();
    } catch {
      const guardado = localStorage.getItem("codex-dictionary");
      dictionary = guardado ? JSON.parse(guardado) : [];
      status.textContent = guardado
        ? "Usando datos guardados en este navegador."
        : "Abre la página mediante un servidor local para cargar dictionary.json.";
    }
    renderizar();
  }

  buscador?.addEventListener("input", renderizar);
  buscador?.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      mostrarResultadosHero();
    }
  });
  document.querySelector("#boton-buscar")?.addEventListener("click", mostrarResultadosHero);
  document.querySelector("#cerrar-resultados")?.addEventListener("click", cerrarResultados);
  document.querySelector("#cerrar-categoria")?.addEventListener("click", cerrarCategoria);
  categoryModal?.addEventListener("click", (evento) => {
    if (evento.target === categoryModal) cerrarCategoria();
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !categoryModal.hidden) cerrarCategoria();
  });

  languageGrid?.addEventListener("click", (evento) => {
    const tarjeta = evento.target.closest("[data-category]");
    if (tarjeta) abrirCategoria(tarjeta.dataset.category);
  });
  languageGrid?.addEventListener("keydown", (evento) => {
    const tarjeta = evento.target.closest("[data-category]");
    if (tarjeta && (evento.key === "Enter" || evento.key === " ")) {
      evento.preventDefault();
      abrirCategoria(tarjeta.dataset.category);
    }
  });

  termForm?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const datos = new FormData(termForm);
    dictionary.unshift({
      term: datos.get("term").trim(),
      definition: datos.get("definition").trim(),
      category: datos.get("category").trim(),
      tags: datos.get("tags").split(",").map((tag) => tag.trim()).filter(Boolean),
      code: datos.get("code").trim(),
      language: datos.get("category").trim().toLowerCase(),
    });
    guardarLocalmente();
    termForm.reset();
    renderizar();
    status.textContent = "Término agregado en este navegador.";
  });

  document.addEventListener("click", async (evento) => {
    const copiar = evento.target.closest("[data-copy]");
    if (copiar) {
      try {
        await navigator.clipboard.writeText(dictionary[copiar.dataset.copy].code || "");
      } catch {
        copiar.textContent = "No disponible";
        setTimeout(() => { copiar.textContent = "Copiar código"; }, 1500);
        return;
      }
      const textoOriginal = copiar.textContent;
      copiar.textContent = "Copiado";
      setTimeout(() => { copiar.textContent = textoOriginal; }, 1500);
      return;
    }
    const favorito = evento.target.closest("[data-favorite]");
    if (favorito) {
      const item = dictionary[favorito.dataset.favorite];
      favoritos.has(clave(item)) ? favoritos.delete(clave(item)) : favoritos.add(clave(item));
      guardarPreferencias();
      renderizar();
      if (!heroResults.hidden) mostrarResultadosHero();
      if (!categoryModal.hidden) renderizarCategoria();
    }
  });

  function descargar(contenido, nombre, tipo) {
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  document.querySelector("[data-action='export-word']")?.addEventListener("click", () => {
    const filas = dictionary.map((item) => `<h2>${escapeHtml(item.term)}</h2><p><strong>${escapeHtml(item.category)}</strong> | ${escapeHtml((item.tags || []).join(", "))}</p><p>${escapeHtml(item.definition)}</p><pre>${escapeHtml(item.code || "")}</pre>`).join("");
    descargar(`<html><body><h1>Diccionario CodeX</h1>${filas}</body></html>`, "codex-diccionario.doc", "application/msword");
  });

  document.querySelector("[data-action='export-pdf']")?.addEventListener("click", () => {
    const ventana = window.open("", "_blank");
    ventana.document.write(`<title>Diccionario CodeX</title><h1>Diccionario CodeX</h1>${dictionary.map((item) => `<h2>${escapeHtml(item.term)}</h2><p><strong>${escapeHtml(item.category)}</strong> | ${escapeHtml((item.tags || []).join(", "))}</p><p>${escapeHtml(item.definition)}</p><pre>${escapeHtml(item.code || "")}</pre>`).join("")}`);
    ventana.document.close();
    ventana.print();
  });

  importFile?.addEventListener("change", async () => {
    const archivo = importFile.files[0];
    if (!archivo) return;
    try {
      const contenido = await archivo.text();
      const importados = archivo.name.endsWith(".json") ? JSON.parse(contenido) : contenido.split(/\r?\n/).slice(1).filter(Boolean).map((linea) => {
        const [term, definition, category, tags, code] = linea.split(",");
        return { term: term?.trim(), definition: definition?.trim(), category: category?.trim(), tags: tags ? tags.split("|").map((tag) => tag.trim()) : [], code: code?.trim() || "" };
      });
      if (!Array.isArray(importados) || importados.some((item) => !item.term || !item.definition || !item.category)) throw new Error();
      dictionary = [...importados, ...dictionary];
      guardarLocalmente();
      renderizar();
      status.textContent = `${importados.length} términos importados.`;
    } catch {
      status.textContent = "Archivo inválido. Usa JSON o CSV con term,definition,category.";
    }
    importFile.value = "";
  });

  document.querySelector("[data-action='arriba']")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  const temaGuardado = localStorage.getItem("codex-theme");
  if (temaGuardado === "claro") document.body.classList.add("modo-claro");
  document.querySelector("[data-action='tema']")?.addEventListener("click", (evento) => {
    document.body.classList.toggle("modo-claro");
    const tema = document.body.classList.contains("modo-claro") ? "claro" : "oscuro";
    localStorage.setItem("codex-theme", tema);
    evento.currentTarget.setAttribute("aria-label", `Cambiar a modo ${tema === "claro" ? "oscuro" : "claro"}`);
  });
  cargarDiccionario();
});
