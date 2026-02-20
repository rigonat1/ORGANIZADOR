from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

ARQUIVO_DADOS = "gastos.json"

def carregar_dados():
    if not os.path.exists(ARQUIVO_DADOS):
        return []
    
    try:
        with open(ARQUIVO_DADOS, 'r', encoding='utf-8') as arquivo:
            return json.load(arquivo)
    except (json.JSONDecodeError, FileNotFoundError):
        return []

def salvar_dados(dados):
    with open(ARQUIVO_DADOS, 'w', encoding='utf-8') as arquivo:
        json.dump(dados, arquivo, indent=4, ensure_ascii=False)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/gastos', methods=['GET'])
def get_gastos():
    dados = carregar_dados()
    return jsonify(dados)

@app.route('/api/gastos', methods=['POST'])
def adicionar_gasto():
    dados = carregar_dados()
    novo_gasto = request.json
    
    if not novo_gasto.get('valor') or not novo_gasto.get('categoria'):
        return jsonify({'erro': 'Dados inválidos'}), 400
    
    novo_gasto['id'] = int(datetime.now().timestamp() * 1000)
    
    if not novo_gasto.get('data'):
        novo_gasto['data'] = datetime.now().strftime("%Y-%m-%d")
    
    novo_gasto['valor'] = float(novo_gasto['valor'])
    
    dados.append(novo_gasto)
    salvar_dados(dados)
    
    return jsonify({'mensagem': 'Gasto adicionado!', 'gasto': novo_gasto})

@app.route('/api/gastos/<int:gasto_id>', methods=['PUT'])
def atualizar_gasto(gasto_id):
    dados = carregar_dados()
    dados_att = request.json
    
    for gasto in dados:
        if gasto['id'] == gasto_id:
            gasto['data'] = dados_att.get('data', gasto['data'])
            gasto['categoria'] = dados_att.get('categoria', gasto['categoria'])
            gasto['descricao'] = dados_att.get('descricao', gasto['descricao'])
            gasto['valor'] = float(dados_att.get('valor', gasto['valor']))
            break
    
    salvar_dados(dados)
    return jsonify({'mensagem': 'Gasto atualizado!'})

@app.route('/api/gastos/<int:gasto_id>', methods=['DELETE'])
def deletar_gasto(gasto_id):
    dados = carregar_dados()
    dados = [g for g in dados if g['id'] != gasto_id]
    salvar_dados(dados)
    return jsonify({'mensagem': 'Gasto deletado!'})

@app.route('/api/estatisticas', methods=['GET'])
def get_estatisticas():
    dados = carregar_dados()
    
    if not dados:
        return jsonify({
            'total': 0,
            'por_categoria': {},
            'por_mes': {}
        })
    
    total = sum(g['valor'] for g in dados)
    
    por_categoria = {}
    for g in dados:
        cat = g['categoria']
        por_categoria[cat] = por_categoria.get(cat, 0) + g['valor']
    
    por_mes = {}
    for g in dados:
        try:
            mes = g['data'][:7]  # YYYY-MM
            por_mes[mes] = por_mes.get(mes, 0) + g['valor']
        except:
            pass
    
    return jsonify({
        'total': total,
        'por_categoria': por_categoria,
        'por_mes': por_mes
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)