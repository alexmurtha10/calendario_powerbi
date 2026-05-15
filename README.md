# 📅 Custom Calendar Visual para Power BI

Este é um componente visual personalizado para o Power BI, focado na exibição de frequência em um layout de calendário mensal. Ele inclui suporte para heatmap (mapa de calor) baseado em volume de dados e marcação automática de feriados.

## 🚀 O que o projeto faz?
O visual transforma dados brutos de data e valores em um calendário interativo que:
- Exibe o volume de ocorrências por dia (ex: logins, presenças, vendas).
- Aplica cores dinâmicas (Heatmap) baseadas no valor máximo do mês.
- Destaca feriados com uma marcação visual e rodapé descritivo.
- Permite filtragem cruzada (Cross-filter) ao clicar em um dia específico.

## 📋 Pré-requisitos de Dados
Para o componente rodar corretamente na tela, o Power BI precisa fornecer os dados através dos seguintes "buckets" de campo:

1.  **Data (DATE_CY):** Coluna de data da sua `Dimensao_Tempo`.
2.  **Valor:** Uma medida calculada (ex: `Total Logins = COUNT(Tabela[ID])`).
3.  **Nome do Feriado:** Coluna contendo a descrição do feriado.
4.  **Classificação do Dia:** Coluna contendo o tipo do feriado (usada para o critério de exibição em exemplo: Feriado Municipal, Feriado Estadual).

## 💡 Configuração Essencial (O "Pulo do Gato")
Para que os feriados apareçam mesmo em dias onde não há dados (por exemplo, quando você filtra um colaborador que não trabalhou no feriado), você **deve**:
1.  Clicar com o botão direito no campo de **DATE_CY, Nome do Feriado e Classificação do Dia** dentro do painel de campos do visual.
2.  Ativar a opção **"Mostrar itens sem dados"** (Show items with no data).
*Isso garante que o calendário seja montado por completo, independente dos filtros aplicados nas medidas.*

## ⚖️ Critérios para Feriados
O componente não marca qualquer texto como feriado. Para evitar "ruídos" nos dados, ele aplica os seguintes filtros internos:
- **Nomes Ignorados:** Se o campo de nome for "Dia Normal", ele será ignorado.
- **Tipos Válidos:** O campo de **Classificação** deve conter um destes termos (case-insensitive):
    - `feriado estadual`
    - `feriado federal`
    - `feriado municipal`
    - `feriado universal`

## 🛠️ Estrutura do Código
- `visual.ts`: Gerencia o fluxo de dados do Power BI e a lógica de seleção.
- `calendar.ts`: Contém a lógica de negócio para construir a matriz do mês (semanas/dias).
- `renderer.ts`: Responsável por gerar o HTML/DOM do visual.
- `visual.less`: Toda a estilização e regras de cores do calendário.

---
*Suporte: Caso o feriado suma ao filtrar, verifique se a coluna de classificação está correta e se a opção "Mostrar itens sem dados" está ativa.*
