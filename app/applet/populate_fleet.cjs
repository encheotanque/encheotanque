const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });

  try {
    // Populate tb_empresa (Tripled from 9 to 27)
    const empresas = [
      ['12345678000101', 'Logística Avançada S.A.', 'LogiTrans', 1],
      ['98765432000199', 'Frotas de Aluguel LTDA', 'RentFrota', 1],
      ['55443322000188', 'Expresso da Mata Transportes', 'ExpressoMata', 1],
      ['11223344000155', 'TransSul Logística Integrada', 'TransSul', 1],
      ['66778899000122', 'Rápido Sudeste Entregas', 'RapidoSudeste', 1],
      ['44556677000133', 'Global Cargo Soluções', 'GlobalCargo', 1],
      ['22334455000144', 'Nacional Rodoviário S/A', 'NacionalRodo', 1],
      ['88990011000166', 'Ponta a Ponta Transportes', 'PontaPonta', 1],
      ['12121212000100', 'Via Verde Distribuidora', 'ViaVerde', 1],
      ['23232323000111', 'Leste Oeste Cargas', 'LEOCargas', 1],
      ['34343434000122', 'Norte Sul Express', 'NSE', 1],
      ['45454545000133', 'Brasil Logística Total', 'BLT', 1],
      ['56565656000144', 'Mega Frota Distribuição', 'MegaFrota', 1],
      ['67676767000155', 'Veloz Logística', 'Veloz', 1],
      ['78787878000166', 'Prime Transportadora', 'PrimeTrans', 1],
      ['89898989000177', 'Master Cargas S.A.', 'MasterCargas', 1],
      ['90909090000188', 'Águia Real Transportes', 'AguiaReal', 1],
      ['10101010000199', 'Estrela do Norte Log', 'EstrelaNorte', 1],
      ['21212121000121', 'Rota 66 Logística', 'Rota66', 1],
      ['32323232000132', 'Horizonte Transportes', 'Horizonte', 1],
      ['43434343000143', 'União Distribuidora', 'UniaoDist', 1],
      ['54545454000154', 'Atlântica Cargas', 'Atlantica', 1],
      ['65656565000165', 'Serrana Logística', 'Serrana', 1],
      ['76767676000176', 'Litoral Transportes', 'LitoralTrans', 1],
      ['87878787000187', 'Interior Log LTDA', 'InteriorLog', 1],
      ['98989898000198', 'Central de Frotas Brasil', 'CentralFrotas', 1],
      ['13131313000133', 'Logística Padrão Ouro', 'LogPadrão', 1]
    ];

    for (const emp of empresas) {
      await pool.query("INSERT INTO tb_empresa (nu_emp_cnpj, nm_emp_razao, nm_emp_fantasia, fl_ativo) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nm_emp_razao=VALUES(nm_emp_razao)", emp);
    }
    console.log("tb_empresa populated.");

    // Get empresa IDs
    const [empRows] = await pool.query("SELECT id_empresa FROM tb_empresa");
    const empIds = empRows.map(r => r.id_empresa);

    if (empIds.length === 0) throw new Error("No empresas found");

    // Populate tb_motorista (Tripled from 15 to 45)
    const motoristas = [
      ['11122233344', '12345678901', '2030-12-31', 'João Carlos da Silva', 1, empIds[0 % empIds.length]],
      ['55566677788', '98765432101', '2028-05-15', 'Ricardo Oliveira Porto', 1, empIds[0 % empIds.length]],
      ['99900011122', '45612378901', '2029-10-20', 'Maria Auxiliadora Santos', 1, empIds[1 % empIds.length]],
      ['33344455566', '78912345601', '2027-02-10', 'Antônio Bento Ferreira', 1, empIds[1 % empIds.length]],
      ['77788899900', '32165498701', '2031-01-01', 'Francisco Rodrigues de Lima', 1, empIds[2 % empIds.length]],
      ['10120230340', '14725836900', '2026-08-12', 'Luiz Gonzaga Bezerra', 1, empIds[3 % empIds.length]],
      ['20230340450', '36925814700', '2029-03-30', 'Carlos Alberto Nobre', 1, empIds[3 % empIds.length]],
      ['30340450560', '25836914700', '2028-11-22', 'Pedro de Alcântara', 1, empIds[4 % empIds.length]],
      ['40450560670', '95175345600', '2027-04-14', 'José Bonifácio Silva', 1, empIds[4 % empIds.length]],
      ['50560670780', '15935745600', '2030-07-07', 'Ana Paula Arósio', 1, empIds[5 % empIds.length]],
      ['60670780890', '75395145600', '2031-12-25', 'Juliana Paes Correia', 1, empIds[6 % empIds.length]],
      ['70780890901', '85274145600', '2026-05-18', 'Marcos Palmeira Neto', 1, empIds[7 % empIds.length]],
      ['80890901011', '96325874100', '2028-09-09', 'Fernanda Montenegro', 1, empIds[8 % empIds.length]],
      ['90901011122', '14785236900', '2029-01-15', 'Selton Mello Pereira', 1, empIds[2 % empIds.length]],
      ['11221122112', '12312312300', '2030-10-10', 'Wagner Moura Sampaio', 1, empIds[5 % empIds.length]],
      ['13131313131', '32132132100', '2027-11-30', 'Raimundo Nonato', 1, empIds[9 % empIds.length]],
      ['14141414141', '15915915900', '2028-04-12', 'Manoel Gomes', 1, empIds[10 % empIds.length]],
      ['15151515151', '75375375300', '2029-09-09', 'Chico Buarque', 1, empIds[11 % empIds.length]],
      ['16161616161', '95195195100', '2030-01-01', 'Gilberto Gil', 1, empIds[12 % empIds.length]],
      ['17171717171', '85285285200', '2031-03-20', 'Caetano Veloso', 1, empIds[13 % empIds.length]],
      ['18181818181', '45645645600', '2026-07-07', 'Zeca Pagodinho', 1, empIds[14 % empIds.length]],
      ['19191919191', '78978978900', '2027-12-25', 'Alcione Ferreira', 1, empIds[15 % empIds.length]],
      ['21212121212', '12341234100', '2028-10-10', 'Ivete Sangalo', 1, empIds[16 % empIds.length]],
      ['22222222222', '43214321400', '2029-11-11', 'Claudia Leitte', 1, empIds[17 % empIds.length]],
      ['23232323232', '56785678500', '2030-05-05', 'Daniel Camargo', 1, empIds[18 % empIds.length]],
      ['24242424242', '87658765800', '2031-06-06', 'Leonardo Costa', 1, empIds[19 % empIds.length]],
      ['25252525252', '11223344500', '2032-07-07', 'Luan Santana', 1, empIds[20 % empIds.length]],
      ['26262626262', '55667788900', '2026-08-08', 'Gusttavo Lima', 1, empIds[21 % empIds.length]],
      ['27272727272', '99001122300', '2027-09-09', 'Marília Mendonça', 1, empIds[22 % empIds.length]],
      ['28282828282', '33445566700', '2028-10-10', 'Henrique Juliano', 1, empIds[23 % empIds.length]],
      ['29292929292', '77889900100', '2029-11-11', 'Maiara Maraisa', 1, empIds[24 % empIds.length]],
      ['31313131313', '12121212100', '2030-12-12', 'Jorge Mateus', 1, empIds[25 % empIds.length]],
      ['32323232323', '34343434300', '2026-01-01', 'Bruno Marrone', 1, empIds[26 % empIds.length]],
      ['33333333333', '56565656500', '2027-02-02', 'Wesley Safadão', 1, empIds[0 % empIds.length]],
      ['34343434343', '78787878700', '2028-03-03', 'Anitta Machado', 1, empIds[1 % empIds.length]],
      ['35353535353', '90909090900', '2029-04-04', 'Ludmilla Oliveira', 1, empIds[2 % empIds.length]],
      ['36363636363', '10203040500', '2030-05-05', 'Pabllo Vittar', 1, empIds[3 % empIds.length]],
      ['37373737373', '60708090100', '2031-06-06', 'Gloria Groove', 1, empIds[4 % empIds.length]],
      ['38383838383', '11223344555', '2032-07-07', 'Iza Pesadão', 1, empIds[5 % empIds.length]],
      ['39393939393', '66778899000', '2026-08-08', 'Luísa Sonza', 1, empIds[6 % empIds.length]],
      ['41414141414', '12300012300', '2027-09-09', 'Jão Vitor', 1, empIds[7 % empIds.length]],
      ['42424242424', '45600045600', '2028-10-10', 'Dilsinho Pagode', 1, empIds[8 % empIds.length]],
      ['43434343434', '78900078900', '2029-11-11', 'Ferrugem Brasil', 1, empIds[9 % empIds.length]],
      ['44444444444', '11100011100', '2030-12-12', 'Thiaguinho Sousa', 1, empIds[10 % empIds.length]],
      ['45454545454', '22200022200', '2031-01-01', 'Péricles Faria', 1, empIds[11 % empIds.length]]
    ];

    for (const mot of motoristas) {
       await pool.query("INSERT INTO tb_motorista (nu_mot_cpf, nu_mot_cnh, dt_mot_cnh_val, nm_mot, fl_ativo, id_empresa) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nm_mot=VALUES(nm_mot)", mot);
    }
    console.log("tb_motorista populated.");

    // Get motorista IDs
    const [motRows] = await pool.query("SELECT id_motorista FROM tb_motorista");
    const motIds = motRows.map(r => r.id_motorista);

    // Populate tb_veiculo (Tripled from 15 to 45)
    const veiculos = [
      ['ABC1D23', '12345678901', '2022-01-01', 'Scania', 'R450 Highline', 1, motIds[0 % motIds.length]],
      ['XYZ9K88', '98765432109', '2021-01-01', 'Volvo', 'FH 540 Globetrotter', 1, motIds[1 % motIds.length]],
      ['JHK4M55', '55544433322', '2023-01-01', 'Mercedes-Benz', 'Sprinter 416', 1, motIds[2 % motIds.length]],
      ['LOP7Q12', '11122233344', '2020-01-01', 'Volkswagen', 'Constellation 24.280', 1, motIds[3 % motIds.length]],
      ['NMK0P99', '66655544433', '2019-01-01', 'Ford', 'Cargo 816', 1, motIds[4 % motIds.length]],
      ['KJH8G54', '44433322211', '2022-05-01', 'Iveco', 'Hi-Way 600', 1, motIds[5 % motIds.length]],
      ['WER2T99', '11111111111', '2023-06-15', 'DAF', 'XF 105', 1, motIds[6 % motIds.length]],
      ['PLO0M11', '22222222222', '2021-08-20', 'MAN', 'TGX 28.440', 1, motIds[7 % motIds.length]],
      ['XCV5B22', '33333333333', '2020-12-10', 'Scania', 'G420', 1, motIds[8 % motIds.length]],
      ['RTY7U33', '44444444444', '2019-03-05', 'Volvo', 'VM 330', 1, motIds[9 % motIds.length]],
      ['BNM9I44', '55555555555', '2023-11-28', 'Mercedes-Benz', 'Actros 2651', 1, motIds[10 % motIds.length]],
      ['QWE1R55', '66666666666', '2022-07-14', 'Volkswagen', 'Meteor 28.460', 1, motIds[11 % motIds.length]],
      ['ASD3F66', '77777777777', '2021-02-22', 'Ford', 'F-4000', 1, motIds[12 % motIds.length]],
      ['ZXC5G77', '88888888888', '2020-09-30', 'Iveco', 'Daily 30-130', 1, motIds[13 % motIds.length]],
      ['TYU9H88', '99999999999', '2024-01-01', 'Scania', 'R540', 1, motIds[14 % motIds.length]],
      ['MKL1J22', '10101010101', '2022-02-02', 'Scania', 'P310', 1, motIds[15 % motIds.length]],
      ['OPQ3L44', '20202020202', '2021-03-03', 'Volvo', 'FH16 750', 1, motIds[16 % motIds.length]],
      ['RST5O66', '30303030303', '2023-04-04', 'Mercedes-Benz', 'Atego 2426', 1, motIds[17 % motIds.length]],
      ['UVW7P88', '40404040404', '2020-05-05', 'Volkswagen', 'Delivery 9.170', 1, motIds[18 % motIds.length]],
      ['XYZ9R00', '50505050505', '2019-06-06', 'Ford', 'F-250', 1, motIds[19 % motIds.length]],
      ['ABC2S11', '60606060606', '2022-07-07', 'Iveco', 'Tector 24-280', 1, motIds[20 % motIds.length]],
      ['DEF4T22', '70707070707', '2023-08-08', 'DAF', 'CF 410', 1, motIds[21 % motIds.length]],
      ['GHI6U33', '80808080808', '2021-09-09', 'MAN', 'TGM 18.290', 1, motIds[22 % motIds.length]],
      ['JKL8V44', '90909090909', '2020-10-10', 'Scania', 'R620', 1, motIds[23 % motIds.length]],
      ['MNO0W55', '11221122112', '2019-11-11', 'Volvo', 'VNL 860', 1, motIds[24 % motIds.length]],
      ['PQR2X66', '33443344334', '2023-12-12', 'Mercedes-Benz', 'Axor 2544', 1, motIds[25 % motIds.length]],
      ['STU4Y77', '55665566556', '2022-01-01', 'Volkswagen', 'Worker 15.190', 1, motIds[26 % motIds.length]],
      ['VWX6Z88', '77887788778', '2021-02-02', 'Ford', 'Cargo 2429', 1, motIds[27 % motIds.length]],
      ['YZA8A99', '99009900990', '2020-03-03', 'Iveco', 'Stralis 600', 1, motIds[28 % motIds.length]],
      ['BCD0B00', '12121212121', '2019-04-04', 'Scania', 'R440', 1, motIds[29 % motIds.length]],
      ['EFG2C11', '23232323232', '2023-05-05', 'Volvo', 'FMX 500', 1, motIds[30 % motIds.length]],
      ['HIJ4D22', '34343434343', '2022-06-06', 'Mercedes-Benz', 'Accelo 1016', 1, motIds[31 % motIds.length]],
      ['KLM6E33', '45454545454', '2021-07-07', 'Volkswagen', 'Constellation 17.230', 1, motIds[32 % motIds.length]],
      ['NOP8F44', '56565656565', '2020-08-08', 'Ford', 'Cargo 1119', 1, motIds[33 % motIds.length]],
      ['PQR0G55', '67676767676', '2019-09-09', 'Iveco', 'Daily 55-170', 1, motIds[34 % motIds.length]],
      ['STU2H66', '78787878787', '2023-10-10', 'DAF', 'XG+ 530', 1, motIds[35 % motIds.length]],
      ['VWX4I77', '89898989898', '2022-11-11', 'Scania', '770 S', 1, motIds[36 % motIds.length]],
      ['YZA6J88', '90909090909', '2021-12-12', 'Volvo', 'FH Electric', 1, motIds[37 % motIds.length]],
      ['BCD8K99', '12123434565', '2020-01-01', 'Mercedes-Benz', 'eActros', 1, motIds[38 % motIds.length]],
      ['EFG0L00', '23234545676', '2019-02-02', 'Volkswagen', 'e-Delivery', 1, motIds[39 % motIds.length]],
      ['HIJ2M11', '34345656787', '2023-03-03', 'Iveco', 'e-Daily', 1, motIds[40 % motIds.length]],
      ['KLM4N22', '45456767898', '2022-04-04', 'Scania', 'P250', 1, motIds[41 % motIds.length]],
      ['NOP6O33', '56567878909', '2021-05-05', 'Volvo', 'VM 270', 1, motIds[42 % motIds.length]],
      ['PQR8P44', '67678989010', '2020-06-06', 'Mercedes-Benz', 'Sprinter 516', 1, motIds[43 % motIds.length]],
      ['STU0Q55', '78789090121', '2024-07-07', 'Scania', 'R500', 1, motIds[44 % motIds.length]]
    ];

    for (const v of veiculos) {
       await pool.query("INSERT INTO tb_veiculo (id_placa, nu_renavan, aa_fabricacao, nm_marca, nm_modelo, fl_ativo, id_motorista) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nm_modelo=VALUES(nm_modelo)", v);
    }
    console.log("tb_veiculo populated.");

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
