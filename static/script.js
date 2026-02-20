let graficoPizza = null;
let graficoBarras = null;
let todosGastos = [];

// Cores para os gráficos
const cores = [
    '#0d6efd', '#198754', '#dc3545', '#ffc107', 
    '#0dcaf0', '#6c757d', '#6610f2', '#e83e8c'
];

document.addEventListener('DOMContentLoaded', () => {
    carregarGastos();
    
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('data').value = hoje;
    
    document.getElementById('gastoForm').addEventListener('submit', salvarGasto);
    
    document.getElementById('filtroCategoria').addEventListener('input', filtrarGastos);
    document.getElementById('filtroData').addEventListener('input', filtrarGastos);
    document.getElementById('filtroDescricao').addEventListener('input', filtrarGastos);
});

// ============ API: Carregar gastos ============
async function carregarGastos() {
    try {
        const resposta = await fetch('/api/gastos');
        todosGastos = await resposta.json();
        renderizarTabela(todosGastos);
        atualizarEstatisticas();
        atualizarGraficos();
    } catch (erro) {
        console.error('Erro ao carregar gastos:', erro);
        alert('Erro ao carregar dados. Verifique se o servidor está rodando.');
    }
}

function renderizarTabela(gastos) {
    const tbody = document.getElementById('corpoTabela');
    tbody.innerHTML = '';
    
    gastos.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    if (gastos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum gasto encontrado</td></tr>';
        return;
    }
    
    gastos.forEach(gasto => {
        const dataFormatada = formatarDataBR(gasto.data);
        const valorFormatado = gasto.valor.toFixed(2).replace('.', ',');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td><span class="badge bg-primary">${gasto.categoria}</span></td>
            <td>${gasto.descricao}</td>
            <td class="valor-positivo">R$ ${valorFormatado}</td>
            <td>
                <button class="btn btn-sm btn-warning btn-action" onclick="editarGasto(${gasto.id})" title="Editar">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger btn-action" onclick="excluirGasto(${gasto.id})" title="Excluir">
                    <i class="bi bi-trash"></i>
                </button>,
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function salvarGasto(e) {
    e.preventDefault();
    
    const id = document.getElementById('gastoId').value;
    const data = document.getElementById('data').value;
    const categoria = document.getElementById('categoria').value;
    const descricao = document.getElementById('descricao').value;
    const valor = parseFloat(document.getElementById('valor').value);
    
    // Validação simples
    if (!data || !categoria || !descricao || isNaN(valor)) {
        alert('Por favor, preencha todos os campos!');
        return;
    }
    
    const gasto = {
        data: data,
        categoria: categoria,
        descricao: descricao,
        valor: valor
    };
    
    let url = '/api/gastos';
    let metodo = 'POST';
    
    if (id) {
        url = `/api/gastos/${id}`;
        metodo = 'PUT';
    }
    
    try {
        const resposta = await fetch(url, {
            method: metodo,
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(gasto)
        });
        
        if (resposta.ok) {
            // Limpar formulário
            limparFormulario();
            // Recarregar dados
            await carregarGastos();
            // Mostrar mensagem
            const mensagem = id ? 'Gasto atualizado com sucesso!' : 'Gasto adicionado com sucesso!';
            showToast(mensagem, 'success');
        } else {
            alert('Erro ao salvar gasto');
        }
    } catch (erro) {
        console.error('Erro ao salvar:', erro);
        alert('Erro ao salvar gasto. Verifique a conexão.');
    }
}

function editarGasto(id) {
    const gasto = todosGastos.find(g => g.id === id);
    if (!gasto) return;
    
    document.getElementById('gastoId').value = gasto.id;
    document.getElementById('data').value = gasto.data;
    document.getElementById('categoria').value = gasto.categoria;
    document.getElementById('descricao').value = gasto.descricao;
    document.getElementById('valor').value = gasto.valor;
    
    document.getElementById('formTitulo').innerHTML = '<i class="bi bi-pencil-circle"></i> Editar Gasto';
    document.getElementById('btnSalvar').innerHTML = '<i class="bi bi-check-lg"></i>';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


async function excluirGasto(id) {
    if (!confirm('Tem certeza que deseja excluir este gasto?')) {
        return;
    }
    
    try {
        const resposta = await fetch(`/api/gastos/${id}`, {
            method: 'DELETE'
        });
        
        if (resposta.ok) {
            await carregarGastos();
            showToast('Gasto excluído com sucesso!', 'danger');
        } else {
            alert('Erro ao excluir gasto');
        }
    } catch (erro) {
        console.error('Erro ao excluir:', erro);
        alert('Erro ao excluir gasto');
    }
}

function atualizarEstatisticas() {
    const total = todosGastos.reduce((acc, g) => acc + g.valor, 0);
    document.getElementById('totalGeral').innerText = `R$ ${total.toFixed(2).replace('.',  ',')}`;
    document.getElementById('totalRegistros').innerText = todosGastos.length;
    
    const categorias = {};
    todosGastos.forEach(g => {
        categorias[g.categoria] = (categorias[g.categoria] || 0) + g.valor;
    });
    
    let maiorCat = '-';
    let maiorValor = 0;
    for (const [cat, valor] of Object.entries(categorias)) {
        if (valor > maiorValor) {
            maiorValor = valor;
            maiorCat = cat;
        }
    }
    document.getElementById('maiorCategoria').innerText = maiorCat;
}

function atualizarGraficos() {
    const categorias = {};
    todosGastos.forEach(g => {
        categorias[g.categoria] = (categorias[g.categoria] || 0) + g.valor;
    });
    
    const ctxPizza = document.getElementById('graficoPizza');
    if (ctxPizza) {
        if (graficoPizza) graficoPizza.destroy();
        
        graficoPizza = new Chart(ctxPizza, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categorias),
                datasets: [{
                    data: Object.values(categorias),
                    backgroundColor: cores,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    const meses = {};
    todosGastos.forEach(g => {
        try {
            const mes = g.data.substring(0, 7); // YYYY-MM
            meses[mes] = (meses[mes] || 0) + g.valor;
        } catch (e) {}
    });
    
    const mesesOrdenados = Object.keys(meses).sort();
    const valoresMeses = mesesOrdenados.map(m => meses[m]);
    
    const ctxBarras = document.getElementById('graficoBarras');
    if (ctxBarras) {
        if (graficoBarras) graficoBarras.destroy();
        
        graficoBarras = new Chart(ctxBarras, {
            type: 'bar',
            data: {
                labels: mesesOrdenados,
                datasets: [{
                    label: 'Gastos por Mês',
                    data: valoresMeses,
                    backgroundColor: '#0d6efd',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toFixed(2);
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// ============ Filtrar Gastos ============
function filtrarGastos() {
    const filtroCat = document.getElementById('filtroCategoria').value.toLowerCase();
    const filtroData = document.getElementById('filtroData').value;
    const filtroDesc = document.getElementById('filtroDescricao').value.toLowerCase();
    
    const gastosFiltrados = todosGastos.filter(g => {
        const matchCat = g.categoria.toLowerCase().includes(filtroCat);
        const matchData = !filtroData || g.data === filtroData;
        const matchDesc = g.descricao.toLowerCase().includes(filtroDesc);
        return matchCat && matchData && matchDesc;
    });
    
    renderizarTabela(gastosFiltrados);
}

function limparFiltros() {
    document.getElementById('filtroCategoria').value = '';
    document.getElementById('filtroData').value = '';
    document.getElementById('filtroDescricao').value = '';
    renderizarTabela(todosGastos);
}

function limparFormulario() {
    document.getElementById('gastoForm').reset();
    document.getElementById('gastoId').value = '';
    document.getElementById('data').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('formTitulo').innerHTML = '<i class="bi bi-plus-circle"></i> Adicionar Gasto';
    document.getElementById('btnSalvar').innerHTML = '<i class="bi bi-check-lg"></i>';
}

function formatarDataBR(dataISO) {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR');
}

function showToast(mensagem, tipo = 'success') {
    const toast = document.getElementById('toast');
    const toastBody = document.getElementById('toastBody');
    const toastHeader = toast.querySelector('.toast-header');
    
    toastBody.innerText = mensagem;
    
    if (tipo === 'success') {
        toastHeader.className = 'toast-header bg-success text-white';
    } else if (tipo === 'danger') {
        toastHeader.className = 'toast-header bg-danger text-white';
    }
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}     
