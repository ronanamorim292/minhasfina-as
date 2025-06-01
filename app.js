// js/app.js

let transacoes = [];
const LOCAL_STORAGE_KEY = 'minhasFinancasTransacoes';
const THEME_KEY = 'minhasFinancasTheme';
const SUN_ICON_CLASS = 'bi bi-sun-fill';
const MOON_ICON_CLASS = 'bi bi-moon-fill';

const categoriasPadrao = [
    "Alimentação", "Moradia", "Transporte", "Lazer", "Salário", "Educação", 
    "Saúde", "Investimentos", "Presentes", "Outros"
];

let modoEdicao = false;
let idTransacaoEditando = null;
let despesasChart = null;

let sortColumn = 'data'; 
let sortDirection = 'desc';
let searchTerm = ''; 
let currentTypeFilter = 'all';
let currentCategoryFilter = 'all';
let dateFilterStart = ''; 
let dateFilterEnd = '';  

let currentPage = 1;
const itemsPerPage = 10; 

let toastEl, toastTitleEl, toastBodyEl, bsToastInstance;

document.addEventListener('DOMContentLoaded', () => {
    console.log('App de Finanças (LocalStorage) Iniciado.');

    toastEl = document.getElementById('liveToast');
    toastTitleEl = document.getElementById('toastTitle');
    toastBodyEl = document.getElementById('toastBody');
    if (toastEl && typeof bootstrap !== 'undefined' && typeof bootstrap.Toast === 'function') {
        bsToastInstance = new bootstrap.Toast(toastEl, { delay: 3500 });
    } else { 
        console.warn("AVISO: Elemento Toast #liveToast ou bootstrap.Toast não encontrado/inicializado. Notificações usarão alerts."); 
    }

    const currentYearEl = document.getElementById('currentYear');
    if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();
    
    const dataInput = document.getElementById('data');
    if (dataInput && !dataInput.value) dataInput.valueAsDate = new Date();
    
    const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
    if (btnCancelarEdicao) btnCancelarEdicao.addEventListener('click', () => resetarFormularioParaAdicao());
    
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIconEl = document.getElementById('themeIcon');
    
    function aplicarTemaSalvo() { 
        const temaSalvo = localStorage.getItem(THEME_KEY);
        if (temaSalvo === 'dark') { 
            document.body.classList.add('dark-mode'); 
            if (themeIconEl) themeIconEl.className = MOON_ICON_CLASS;
        } else { 
            document.body.classList.remove('dark-mode'); 
            if (themeIconEl) themeIconEl.className = SUN_ICON_CLASS; 
        }
    }

    if (themeToggleBtn && themeIconEl) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            let temaAtual = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            themeIconEl.className = temaAtual === 'dark' ? MOON_ICON_CLASS : SUN_ICON_CLASS;
            localStorage.setItem(THEME_KEY, temaAtual);
        });
    }
    aplicarTemaSalvo();

    carregarCategorias(); 
    popularFiltroCategorias(); 
    carregarTransacoesDoLocalStorage();
    configurarFormulario();
    configurarEventListenersDaTabela();
    configurarExportacao(); 
    configurarImportacao(); 
    configurarOrdenacaoTabela();
    configurarBusca(); 
    configurarFiltros(); 
    renderizarTudo(); 

    // <<== LISTENER beforeunload ADICIONADO AQUI ==>>
    window.addEventListener('beforeunload', (event) => {
        console.log('Evento beforeunload: Garantindo que as transações estão salvas no localStorage.');
        salvarTransacoesNoLocalStorage();
        // Opcional: você pode tentar ativar o prompt do navegador para confirmar a saída.
        // Para fazer isso, alguns navegadores exigem que event.preventDefault() seja chamado.
        // event.preventDefault(); // Descomente se quiser tentar o prompt
        // event.returnValue = ''; // Necessário para alguns navegadores para mostrar o prompt padrão
                                  // Deixar vazio para a mensagem padrão do navegador.
                                  // Você não pode personalizar esta mensagem na maioria dos navegadores modernos.
    });
    // <<== FIM DO LISTENER beforeunload ==>>

}); // Fim do DOMContentLoaded

// ... (COLE AQUI O RESTANTE DE TODAS AS SUAS FUNÇÕES: mostrarToast, carregarCategorias, etc.)
// (Exatamente como estavam na última versão completa que eu te enviei, onde tudo estava funcionando)
// Para garantir, vou repetir o corpo das funções abaixo:

function mostrarToast(titulo, mensagem, tipo = 'info') { 
    if (!toastEl || !toastTitleEl || !toastBodyEl || !bsToastInstance) { 
        console.warn('AVISO: Toast não configurado. Usando alert como fallback.', {titulo, mensagem}); 
        alert(`${titulo}: ${mensagem}`); 
        return; 
    }
    toastTitleEl.textContent = titulo; 
    toastBodyEl.textContent = mensagem;
    toastEl.classList.remove('bg-success','bg-danger','bg-warning','bg-info','text-dark'); 
    toastEl.classList.add('text-white');
    let toastClass='bg-info'; 
    if(tipo==='success') toastClass='bg-success'; 
    else if(tipo==='error') toastClass='bg-danger'; 
    else if(tipo==='warning') toastClass='bg-warning';
    toastEl.classList.add(toastClass); 
    bsToastInstance.show();
}

function carregarCategorias() { 
    const selectCategoria = document.getElementById('categoria'); 
    if(!selectCategoria){ console.warn('AVISO: Elemento select #categoria (formulário) não encontrado!'); return; } 
    selectCategoria.innerHTML=''; 
    categoriasPadrao.forEach(cat=>{const opt=document.createElement('option');opt.value=cat;opt.textContent=cat;selectCategoria.appendChild(opt);});
}

function popularFiltroCategorias() { 
    const categoryFilterSelect=document.getElementById('categoryFilter');
    if(!categoryFilterSelect){ console.warn('AVISO: Dropdown de filtro de categoria #categoryFilter não encontrado!'); return; }
    while(categoryFilterSelect.options.length>1){categoryFilterSelect.remove(1);}
    categoriasPadrao.forEach(cat=>{const option=document.createElement('option');option.value=cat;option.textContent=cat;categoryFilterSelect.appendChild(option);});
}

function configurarFormulario() { 
    const form = document.getElementById('formTransacao'); 
    if(!form){ console.warn('AVISO: Formulário #formTransacao não encontrado!'); return; }
    form.addEventListener('submit', (e) => { 
        e.preventDefault(); 
        const dadosFormulario={
            descricao:document.getElementById('descricao').value.trim(),
            valor:parseFloat(document.getElementById('valor').value),
            tipo:document.getElementById('tipo').value,
            categoria:document.getElementById('categoria').value,
            data:document.getElementById('data').value 
        }; 
        if(!dadosFormulario.descricao||isNaN(dadosFormulario.valor)||!dadosFormulario.data||!dadosFormulario.categoria||dadosFormulario.valor<=0){
            mostrarToast('Erro de Validação','Preencha todos os campos corretamente e com valor positivo.','error');return;
        } 
        if(modoEdicao && idTransacaoEditando !== null){
            const index=transacoes.findIndex(t => t.id === idTransacaoEditando);
            if(index !== -1){
                transacoes[index]={ id:idTransacaoEditando, ...dadosFormulario };
                mostrarToast('Sucesso!','Transação atualizada com sucesso.','success');
            } else {
                mostrarToast('Erro','Transação para edição não encontrada.','error');
            }
        } else {
            transacoes.push({ id:Date.now(), ...dadosFormulario });
            mostrarToast('Sucesso!','Transação adicionada com sucesso.','success'); 
        } 
        salvarTransacoesNoLocalStorage();
        renderizarTudo();
        resetarFormularioParaAdicao(); 
        const dataInput = document.getElementById('data'); if(dataInput) dataInput.valueAsDate = new Date(); 
    });
}

function preencherFormularioParaEdicao(transacaoId) { 
    const transacao = transacoes.find(t => t.id === transacaoId);
    if(!transacao){ mostrarToast('Erro','Transação não encontrada para edição.','error'); return; } 
    document.getElementById('descricao').value = transacao.descricao; 
    document.getElementById('valor').value = transacao.valor;
    document.getElementById('tipo').value = transacao.tipo; 
    document.getElementById('categoria').value = transacao.categoria;
    document.getElementById('data').value = transacao.data; 
    document.getElementById('formTitle').textContent = 'Editar Transação'; 
    const btnSubmitForm = document.getElementById('btnSubmitForm');
    btnSubmitForm.innerHTML='<i class="bi bi-save-fill"></i> Salvar Alterações';
    btnSubmitForm.classList.replace('btn-primary','btn-warning'); 
    document.getElementById('btnCancelarEdicao').classList.remove('d-none'); 
    modoEdicao = true; idTransacaoEditando = transacao.id; 
    document.getElementById('formTransacao').scrollIntoView({behavior:'smooth'});
}

function resetarFormularioParaAdicao() { 
    const form = document.getElementById('formTransacao'); if(form) form.reset(); 
    const dataInput = document.getElementById('data'); if(dataInput) dataInput.valueAsDate = new Date(); 
    document.getElementById('formTitle').textContent = 'Adicionar Nova Transação'; 
    const btnSubmitForm = document.getElementById('btnSubmitForm');
    btnSubmitForm.innerHTML = '<i class="bi bi-plus-circle-fill"></i> Adicionar Transação';
    btnSubmitForm.classList.replace('btn-warning','btn-primary'); 
    document.getElementById('btnCancelarEdicao').classList.add('d-none'); 
    modoEdicao = false; idTransacaoEditando = null;
}

function carregarTransacoesDoLocalStorage() { 
    const transacoesSalvas = localStorage.getItem(LOCAL_STORAGE_KEY);
    transacoes = transacoesSalvas ? JSON.parse(transacoesSalvas) : [];
    console.log(`Total de transações carregadas do localStorage: ${transacoes.length}`);
}

function salvarTransacoesNoLocalStorage() { 
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transacoes));
    console.log(`Transações salvas no localStorage. Total: ${transacoes.length}`);
}

function renderizarTudo() {
    atualizarTabela(); 
    atualizarResumo();
    atualizarIndicadoresDeOrdenacao(); 
    if (typeof renderizarGraficoDespesas === 'function') { 
        renderizarGraficoDespesas(); 
    }
}

function atualizarTabela() {
    const tbody = document.getElementById('tabelaTransacoesBody'); 
    if (!tbody) { console.warn("AVISO: Elemento tbody #tabelaTransacoesBody não encontrado!"); return; }
    tbody.innerHTML = ''; 
    let transacoesProcessadas = [...transacoes];
    if (dateFilterStart) { transacoesProcessadas = transacoesProcessadas.filter(t => t.data >= dateFilterStart); }
    if (dateFilterEnd) { transacoesProcessadas = transacoesProcessadas.filter(t => t.data <= dateFilterEnd); }
    if(currentTypeFilter!=='all'){transacoesProcessadas=transacoesProcessadas.filter(t=>t.tipo===currentTypeFilter);}
    if(currentCategoryFilter!=='all'){transacoesProcessadas=transacoesProcessadas.filter(t=>t.categoria===currentCategoryFilter);}
    if(searchTerm){transacoesProcessadas=transacoesProcessadas.filter(t=>t.descricao.toLowerCase().includes(searchTerm));}
    if(sortColumn){
        transacoesProcessadas.sort((a,b)=>{
            let vA=a[sortColumn];let vB=b[sortColumn];
            if(sortColumn==='valor'){vA=parseFloat(vA||0);vB=parseFloat(vB||0);} 
            else if(sortColumn==='data'){vA=new Date(a.data); vB=new Date(b.data);} 
            else if(typeof vA==='string'&&typeof vB==='string'){vA=vA.toLowerCase();vB=vB.toLowerCase();} 
            else{if(vA==null)vA="";if(vB==null)vB="";}
            if(vA<vB)return sortDirection==='asc'?-1:1; if(vA>vB)return sortDirection==='asc'?1:-1; return 0;
        });
    }
    const totalItems = transacoesProcessadas.length; 
    const totalPages = Math.ceil(totalItems/itemsPerPage);
    if(currentPage > totalPages && totalPages > 0){currentPage=totalPages;}else if(totalPages===0){currentPage=1;}
    const startIndex = (currentPage-1)*itemsPerPage; const endIndex = startIndex + itemsPerPage; 
    const transacoesDaPagina = transacoesProcessadas.slice(startIndex,endIndex);
    if(transacoesDaPagina.length===0){const msgV=searchTerm||currentTypeFilter!=='all'||currentCategoryFilter!=='all'||dateFilterStart||dateFilterEnd?'Nenhuma transação encontrada para os filtros/busca aplicados.':'Nenhuma transação registrada ainda.';tbody.innerHTML=`<tr><td colspan="6" class="text-center">${msgV}</td></tr>`;}
    else{transacoesDaPagina.forEach(t=>{const tr=document.createElement('tr');const tipoCls=t.tipo==='receita'?'receita':'despesa';const valFmt=(typeof t.valor==='number'?t.valor:0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});tr.innerHTML=`<td>${formatarDataParaExibicao(t.data)}</td><td>${t.descricao}</td><td class="${tipoCls}">${valFmt}</td><td>${t.tipo.charAt(0).toUpperCase()+t.tipo.slice(1)}</td><td>${t.categoria}</td><td><button class="btn btn-warning btn-sm edit-btn me-1" data-id="${t.id}" title="Editar"><i class="bi bi-pencil-fill"></i></button><button class="btn btn-danger btn-sm delete-btn" data-id="${t.id}" title="Excluir"><i class="bi bi-trash-fill"></i></button></td>`;tbody.appendChild(tr);});}
    renderizarControlesPaginacao(totalPages);
}

function renderizarControlesPaginacao(totalPages) {
    const pC=document.getElementById('paginationControls'); if(!pC){console.warn("AVISO: Elemento #paginationControls não encontrado!"); return;}
    pC.innerHTML=''; if(totalPages<=1){return;}
    const prevLi=document.createElement('li');prevLi.className=`page-item ${currentPage===1?'disabled':''}`;const prevLink=document.createElement('button');prevLink.className='page-link';prevLink.textContent='Anterior';if(currentPage===1)prevLink.setAttribute('disabled','true');prevLink.addEventListener('click',()=>{if(currentPage>1){currentPage--;renderizarTudo();}});prevLi.appendChild(prevLink);pC.appendChild(prevLi);
    let iS=Math.max(1,currentPage-2);let iE=Math.min(totalPages,currentPage+2);if(currentPage<=3){iE=Math.min(totalPages,5);}if(currentPage>=totalPages-2){iS=Math.max(1,totalPages-4);}
    for(let i=iS;i<=iE;i++){const pLi=document.createElement('li');pLi.className=`page-item ${i===currentPage?'active':''}`;const pLink=document.createElement('button');pLink.className='page-link';pLink.textContent=i;pLink.addEventListener('click',()=>{currentPage=i;renderizarTudo();});pLi.appendChild(pLink);pC.appendChild(pLi);}
    const nextLi=document.createElement('li');nextLi.className=`page-item ${currentPage===totalPages?'disabled':''}`;const nextLink=document.createElement('button');nextLink.className='page-link';nextLink.textContent='Próximo';if(currentPage===totalPages)nextLink.setAttribute('disabled','true');nextLink.addEventListener('click',()=>{if(currentPage<totalPages){currentPage++;renderizarTudo();}});nextLi.appendChild(nextLink);pC.appendChild(nextLi);
}

function configurarEventListenersDaTabela() { 
    const tabelaBody = document.getElementById('tabelaTransacoesBody'); 
    if(!tabelaBody){console.warn("AVISO: Tabela #tabelaTransacoesBody não encontrada para listeners!"); return;}
    tabelaBody.addEventListener('click',e=>{
        const bE=e.target.closest('.delete-btn');
        const bEd=e.target.closest('.edit-btn');
        if(bE) removerTransacaoPorId(parseInt(bE.dataset.id));
        else if(bEd) preencherFormularioParaEdicao(parseInt(bEd.dataset.id));
    });
}

function removerTransacaoPorId(idParaRemover) { 
    if(confirm('Excluir esta transação?')){
        transacoes=transacoes.filter(t=>t.id!==idParaRemover);
        salvarTransacoesNoLocalStorage();
        renderizarTudo();
        mostrarToast('Removida','Transação removida com sucesso.','info');
        if(modoEdicao&&idTransacaoEditando===idParaRemover)resetarFormularioParaAdicao();
    }
}

function atualizarResumo() { 
    let tProc=[...transacoes];
    if (dateFilterStart) { tProc = tProc.filter(t => t.data >= dateFilterStart); } 
    if (dateFilterEnd) { tProc = tProc.filter(t => t.data <= dateFilterEnd); }
    if(currentTypeFilter!=='all'){tProc=tProc.filter(t=>t.tipo===currentTypeFilter);}
    if(currentCategoryFilter!=='all'){tProc=tProc.filter(t=>t.categoria===currentCategoryFilter);}
    if(searchTerm){tProc=tProc.filter(t=>t.descricao.toLowerCase().includes(searchTerm));}
    const rEl=document.getElementById('totalReceitas'),dEl=document.getElementById('totalDespesas'),sEl=document.getElementById('saldoAtual');
    if(!rEl||!dEl||!sEl){console.warn("AVISO: Elementos do resumo não encontrados!");return;}
    const tR=tProc.filter(t=>t.tipo==='receita').reduce((s,t)=>s+t.valor,0);
    const tD=tProc.filter(t=>t.tipo==='despesa').reduce((s,t)=>s+t.valor,0);
    const s=tR-tD;
    rEl.textContent=tR.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    dEl.textContent=tD.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    sEl.textContent=s.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    sEl.className=s>=0?'saldo-positivo':'saldo-negativo';
}

function formatarDataParaExibicao(dataStr) { 
    if(!dataStr)return 'N/A';const p=dataStr.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:dataStr;
}

function configurarBusca() { 
    const sI=document.getElementById('searchInput');if(!sI){console.warn("AVISO: Campo de busca #searchInput não encontrado!"); return;}
    sI.addEventListener('input',e=>{searchTerm=e.target.value.toLowerCase().trim();currentPage=1;renderizarTudo();});
}

function configurarFiltros() { 
    const tFS=document.getElementById('typeFilter');const cFS=document.getElementById('categoryFilter');
    const dFS = document.getElementById('dateFilterStart'); const dFE = document.getElementById('dateFilterEnd');
    const btnClearDate = document.getElementById('btnClearDateFilters');

    if(tFS){tFS.addEventListener('change',e=>{currentTypeFilter=e.target.value;currentPage=1;renderizarTudo();});}
    else {console.warn("AVISO: Filtro de tipo #typeFilter não encontrado!");}
    if(cFS){cFS.addEventListener('change',e=>{currentCategoryFilter=e.target.value;currentPage=1;renderizarTudo();});}
    else {console.warn("AVISO: Filtro de categoria #categoryFilter não encontrado!");}
    if(dFS){dFS.addEventListener('change',e=>{dateFilterStart=e.target.value;currentPage=1;renderizarTudo();});}
    else {console.warn("AVISO: Filtro de data inicial #dateFilterStart não encontrado!");}
    if(dFE){dFE.addEventListener('change',e=>{dateFilterEnd=e.target.value;currentPage=1;renderizarTudo();});}
    else {console.warn("AVISO: Filtro de data final #dateFilterEnd não encontrado!");}
    if(btnClearDate) {btnClearDate.addEventListener('click', ()=>{if(dFS)dFS.value='';if(dFE)dFE.value='';dateFilterStart='';dateFilterEnd='';currentPage=1;renderizarTudo();mostrarToast('Info','Filtros de data limpos.','info');});}
    else {console.warn("AVISO: Botão #btnClearDateFilters não encontrado!");}
}

function configurarOrdenacaoTabela() { 
    const h=document.querySelectorAll('th[data-column]');
    if(h.length === 0) {console.warn("AVISO: Cabeçalhos de tabela para ordenação não encontrados!");}
    h.forEach(hdr=>{hdr.addEventListener('click',()=>{const cC=hdr.dataset.column;if(!cC)return;if(sortColumn===cC){sortDirection=sortDirection==='asc'?'desc':'asc';}else{sortColumn=cC;sortDirection=(sortColumn==='data'||sortColumn==='valor')?'desc':'asc';}currentPage=1;renderizarTudo();});});
}

function atualizarIndicadoresDeOrdenacao() { 
    const h=document.querySelectorAll('th[data-column]');
    h.forEach(hdr=>{hdr.classList.remove('sorted-asc','sorted-desc');if(hdr.dataset.column===sortColumn){hdr.classList.add(sortDirection==='asc'?'sorted-asc':'sorted-desc');}});
}

function configurarExportacao() { 
    const btn=document.getElementById('btnExportarJson');if(!btn){console.warn("AVISO: Botão #btnExportarJson não encontrado!"); return;}
    btn.addEventListener('click',()=>{if(transacoes.length===0){mostrarToast('Aviso','Nenhuma transação para exportar.','info');return;}const n=`transacoes_backup_${new Date().toISOString().slice(0,10)}.json`;const j=JSON.stringify(transacoes,null,2);const b=new Blob([j],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=n;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);mostrarToast('Exportado','Transações exportadas com sucesso!','success');});
}

function configurarImportacao() { 
    const btn=document.getElementById('btnImportarJson'),inp=document.getElementById('importFile');if(!btn||!inp){console.warn("AVISO: Botões de importação não encontrados!"); return;}
    btn.addEventListener('click',()=>inp.click());inp.addEventListener('change',ev=>{const f=ev.target.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);if(Array.isArray(d)&&d.every(i=>typeof i==='object'&&i!==null&&'id'in i&&'descricao'in i&&'valor'in i&&'tipo'in i&&'categoria'in i&&'data'in i)){if(confirm('Isso substituirá todas as suas transações atuais. Deseja continuar?')){transacoes=d;salvarTransacoesNoLocalStorage();renderizarTudo();mostrarToast('Importado','Transações importadas com sucesso!','success');}}else{mostrarToast('Erro','Arquivo JSON inválido ou formato incorreto.','error');}}catch(err){mostrarToast('Erro','Erro ao ler o arquivo JSON.','error');}finally{ev.target.value=null;}};r.onerror=()=>{mostrarToast('Erro','Erro ao tentar ler o arquivo.','error');ev.target.value=null;};r.readAsText(f);});
}

function renderizarGraficoDespesas() { 
    const cCtx=document.getElementById('despesasChartCanvas');if(!cCtx){console.warn("AVISO: Canvas #despesasChartCanvas não encontrado!"); return;}
    let tPg=[...transacoes];
    if (dateFilterStart) { tPg = tPg.filter(t => t.data >= dateFilterStart); } 
    if (dateFilterEnd) { tPg = tPg.filter(t => t.data <= dateFilterEnd); }
    if(currentTypeFilter!=='all'){if(currentTypeFilter==='despesa'){tPg=tPg.filter(t=>t.tipo==='despesa');}else if(currentTypeFilter==='receita'){if(despesasChart){despesasChart.destroy();despesasChart=null;}if(cCtx.getContext('2d')){const c2d=cCtx.getContext('2d');c2d.clearRect(0,0,cCtx.width,cCtx.height);}return;}}else{tPg=tPg.filter(t=>t.tipo==='despesa');}
    if(currentCategoryFilter!=='all'){tPg=tPg.filter(t=>t.categoria===currentCategoryFilter);}
    const d=tPg;
    if(despesasChart){despesasChart.destroy();despesasChart=null;}
    if(d.length===0){if(cCtx.getContext('2d')){const c2d=cCtx.getContext('2d');c2d.clearRect(0,0,cCtx.width,cCtx.height);}return;}
    const dpc=d.reduce((acc,t)=>{acc[t.categoria]=(acc[t.categoria]||0)+t.valor;return acc;},{});
    const l=Object.keys(dpc);const dV=Object.values(dpc);
    const bgC=['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#E7E9ED','#83D47E','#E089B8','#A0522D','#DAA520','#FF6347'];
    const cC=l.map((_,idx)=>bgC[idx%bgC.length]);
    const data={labels:l,datasets:[{label:'Despesas',data:dV,backgroundColor:cC,hoverOffset:4}]};
    const cfg={type:'pie',data:data,options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'},title:{display:false},tooltip:{callbacks:{label:function(ctx){let lbl=ctx.label||'';if(lbl){lbl+=': ';}if(ctx.parsed!==null){lbl+=ctx.parsed.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}const total=ctx.dataset.data.reduce((a,b)=>a+b,0);const perc=total>0?((ctx.parsed/total)*100).toFixed(2)+'%':'0%';lbl+=` (${perc})`;return lbl;}}}}}};
    despesasChart=new Chart(cCtx,cfg);
}
