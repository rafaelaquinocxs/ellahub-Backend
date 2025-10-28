#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import json
import os

# Importar OpenAI
try:
    from openai import OpenAI
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "Pacote 'openai' não está instalado. Execute: pip install openai"
    }))
    sys.exit(1)

def gerar_resposta_chat(system_prompt, user_message, api_key):
    """Gera resposta de chat usando GPT"""
    try:
        # Criar cliente OpenAI
        client = OpenAI(api_key=api_key)
        
        # Chamar API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        resposta = response.choices[0].message.content
        
        return {
            "success": True,
            "resposta": resposta
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Erro ao gerar resposta: {str(e)}"
        }

def gerar_diagnostico(system_prompt, user_message, api_key):
    """Gera diagnóstico usando GPT"""
    try:
        # Criar cliente OpenAI
        client = OpenAI(api_key=api_key)
        
        # Chamar API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        resposta = response.choices[0].message.content
        
        return {
            "success": True,
            "resposta": resposta
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Erro ao gerar diagnóstico: {str(e)}"
        }

def main():
    try:
        # Configurar encoding UTF-8 para stdin/stdout no Windows
        if sys.platform == 'win32':
            import io
            sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', errors='ignore')
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')
        
        # Ler dados do stdin
        input_data = sys.stdin.read()
        
        if not input_data:
            print(json.dumps({
                "success": False,
                "error": "Nenhum dado recebido via stdin"
            }))
            sys.exit(1)
        
        # Parse JSON
        data = json.loads(input_data)
        
        tipo = data.get('tipo')
        system_prompt = data.get('system_prompt', '')
        user_message = data.get('user_message', '')
        api_key = data.get('api_key', '')
        
        if not tipo:
            print(json.dumps({
                "success": False,
                "error": "Campo 'tipo' é obrigatório"
            }))
            sys.exit(1)
        
        if not api_key:
            print(json.dumps({
                "success": False,
                "error": "Campo 'api_key' é obrigatório"
            }))
            sys.exit(1)
        
        # Processar baseado no tipo
        if tipo == 'chat':
            resultado = gerar_resposta_chat(system_prompt, user_message, api_key)
        elif tipo == 'diagnostico':
            resultado = gerar_diagnostico(system_prompt, user_message, api_key)
        else:
            resultado = {
                "success": False,
                "error": f"Tipo '{tipo}' não reconhecido. Use 'chat' ou 'diagnostico'"
            }
        
        # Retornar resultado
        print(json.dumps(resultado, ensure_ascii=False))
        
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Erro ao fazer parse do JSON: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Erro inesperado: {str(e)}"
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
