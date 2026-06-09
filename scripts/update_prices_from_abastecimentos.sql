-- Script para popular/atualizar a tabela de preços com os valores mais recentes de abastecimentos
INSERT INTO tb_precos_combustiveis (id_posto, id_combustivel, vl_preco_venda, dt_ultima_atualizacao, ds_origem_dado)
SELECT id_posto, id_combustivel, vl_preco_unitario, dh_emissao_nfe, 'SYNC_ABA_BATCH'
FROM (
    SELECT id_posto, id_combustivel, vl_preco_unitario, dh_emissao_nfe,
           ROW_NUMBER() OVER (PARTITION BY id_posto, id_combustivel ORDER BY dh_emissao_nfe DESC) as rn
    FROM tb_abastecimentos
) t
WHERE rn = 1
ON DUPLICATE KEY UPDATE
    vl_preco_venda = VALUES(vl_preco_venda),
    dt_ultima_atualizacao = VALUES(dt_ultima_atualizacao),
    ds_origem_dado = VALUES(ds_origem_dado);
