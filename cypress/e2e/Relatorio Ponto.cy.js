describe('Download de Comprovante de Ponto', () => {
    it.only('Gerar relatório de ponto do último mês', () => {
        //const axpw = 'MTA2MToxMjM0OjA='; //Gabriel
        const axpw = 'ODAyOjEyMzQ6MA=='; //Mario
        //const axpw = 'MTA2NzoyMDE5OjA='; //Alexis
        //const axpw = 'MTA4MDoxMjM0OjA='; //Dani
        //const axpw = 'Njc2MjoxMjM0NTow'; //Lais

        // ===== CONFIGURAÇÃO DO MÊS - MUDE APENAS AQUI =====
        const mesDesejado = 9; // 1=Jan, 2=Fev, 3=Mar, 4=Abr, 5=Mai, 6=Jun, 7=Jul, 8=Ago, 9=Set, 10=Out, 11=Nov, 12=Dez
        const anoDesejado = 2025; // Ano que você quer analisar
        
        // Mapeamento dos funcionários por código de autorização
        const funcionarios = {
            'MTA2MToxMjM0OjA=': 'Gabriel',
            'ODAyOjEyMzQ6MA==': 'Mario',
            'MTA2NzoyMDE5OjA=': 'Alexis',
            'MTA4MDoxMjM0OjA=': 'Dani',
            'Njc2MjoxMjM0NTow': 'Lais'
        };
        const nomeFuncionarioConfig = funcionarios[axpw] || 'Funcionário';
        // ================================================
        
        cy.log(`📊 Gerando relatório de ponto do mês ${mesDesejado}/${anoDesejado}`);
        
        // Calcular período baseado na configuração
        const mesPassado = new Date(anoDesejado, mesDesejado - 1, 1); // Primeiro dia do mês
        const ultimoDiaMesPassado = new Date(anoDesejado, mesDesejado, 0); // Último dia do mês
        const dataInicio = mesPassado.toISOString().split('T')[0];
        const dataFim = ultimoDiaMesPassado.toISOString().split('T')[0];
        
        cy.log(`📅 Período: ${dataInicio} até ${dataFim}`);
        
        // Endpoint que funciona
        const endpointPonto = `https://pontowebapp.secullum.com.br/76863/Batidas/${dataInicio}/${dataFim}`;
        
        let dadosPonto = [];
        let registrosPonto = [];
        
        // Buscar dados de ponto
        cy.request({
            url: endpointPonto,
            failOnStatusCode: false,
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'pt',
                'Authorization': `Basic ${axpw}`,
                'Cache-Control': 'no-cache',
                'Origin': 'https://centraldofuncionario.com.br',
                'Pragma': 'no-cache',
                'Referer': 'https://centraldofuncionario.com.br/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0',
                'X-Sec-Centralfuncionarioversao': '1.37.0'
            }
        }).then((response) => {
            cy.log(`📡 Status: ${response.status} - ${endpointPonto.split('/').slice(-3).join('/')}`);
            
            if (response.status !== 200) {
                cy.log('❌ Erro ao buscar dados de ponto');
                cy.writeFile(`cypress/downloads/relatorio-ponto-erro-${Date.now()}.txt`, 
                    `RELATÓRIO DE PONTO - ${dataInicio} até ${dataFim}\n\n❌ ERRO AO BUSCAR DADOS\n\nStatus: ${response.status}\nEndpoint: ${endpointPonto}`
                );
                return;
            }
            
            dadosPonto = Array.isArray(response.body) ? response.body : [response.body];
            
            // Salvar dados brutos
            cy.writeFile(`cypress/downloads/dados-ponto-brutos-${Date.now()}.json`, {
                endpoint: endpointPonto,
                periodo: `${dataInicio} até ${dataFim}`,
                dados: dadosPonto,
                estrutura_completa: response.body
            });
            
            // Extrair a lista de registros
            if (dadosPonto[0] && dadosPonto[0].lista) {
                registrosPonto = dadosPonto[0].lista;
                cy.log(`✅ Encontrados ${registrosPonto.length} registros de ponto`);
            } else {
                cy.log('❌ Estrutura de dados inesperada');
                return;
            }
            
            // Extrair nome do funcionário dos dados
            let nomeFuncionario = nomeFuncionarioConfig; // Usar o nome do mapeamento primeiro
            
            // Tentar extrair o nome de diferentes locais possíveis (apenas se não encontrou no mapeamento)
            if (nomeFuncionario === 'Funcionário' && dadosPonto[0]) {
                if (dadosPonto[0].nome) {
                    nomeFuncionario = dadosPonto[0].nome;
                } else if (dadosPonto[0].funcionario) {
                    nomeFuncionario = dadosPonto[0].funcionario;
                } else if (dadosPonto[0].usuario) {
                    nomeFuncionario = dadosPonto[0].usuario;
                } else if (registrosPonto.length > 0) {
                    // Procurar nome nos registros
                    const primeiroRegistro = registrosPonto[0];
                    if (primeiroRegistro.nome) {
                        nomeFuncionario = primeiroRegistro.nome;
                    } else if (primeiroRegistro.funcionario) {
                        nomeFuncionario = primeiroRegistro.funcionario;
                    } else if (primeiroRegistro.usuario) {
                        nomeFuncionario = primeiroRegistro.usuario;
                    }
                }
            }
            
            cy.log(`👤 Nome do funcionário: ${nomeFuncionario}`);
            
            // Função para gerar dias úteis do mês
            const gerarDiasUteis = (inicio, fim) => {
                const dias = [];
                const current = new Date(inicio);
                const endDate = new Date(fim);
                
                while (current <= endDate) {
                    const diaSemana = current.getDay();
                    // Excluir sábados (6) e domingos (0)
                    if (diaSemana !== 0 && diaSemana !== 6) {
                        dias.push(new Date(current));
                    }
                    current.setDate(current.getDate() + 1);
                }
                return dias;
            };
            
            cy.log(`📊 Processando ${registrosPonto.length} registros de ponto...`);
            
            // Função para formatar data
            const formatarData = (data) => {
                return data.toLocaleDateString('pt-BR', { 
                    weekday: 'short', 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                });
            };
            
            // Função para analisar batidas do dia
            const analisarBatidasDia = (dia, registros) => {
                const dataStr = dia.toISOString().split('T')[0];
                
                // Encontrar o registro do dia
                const registroDoDia = registros.find(registro => {
                    if (registro.data) {
                        return registro.data.startsWith(dataStr);
                    }
                    return false;
                });
                
                // Se não encontrou registro, é dia sem dados
                if (!registroDoDia) {
                    return {
                        data: dataStr,
                        dataFormatada: formatarData(dia),
                        entrada1: null,
                        saida1: null,
                        entrada2: null,
                        saida2: null,
                        totalBatidas: 0,
                        completo: false,
                        saldo: 'N/A',
                        situacao: 'N/A',
                        tipoRegistro: 'Sem dados'
                    };
                }
                
                // Verificar se é folga - APENAS quando explicitamente marcado como folga oficial
                // Não considerar folga baseado apenas no saldo negativo
                const isFolga = (registroDoDia.situacao === 'Folga') ||
                               (registroDoDia.saldo && registroDoDia.saldo.toLowerCase().includes('folga'));
                
                if (isFolga) {
                    return {
                        data: dataStr,
                        dataFormatada: formatarData(dia),
                        entrada1: null,
                        saida1: null,
                        entrada2: null,
                        saida2: null,
                        totalBatidas: 0,
                        completo: false,
                        saldo: registroDoDia.saldo,
                        situacao: registroDoDia.situacao,
                        tipoRegistro: 'Folga'
                    };
                }
                
                // Filtrar batidas que têm valor preenchido
                const batidasValidas = registroDoDia.batidas.filter(batida => {
                    return batida && batida.valor && batida.valor.trim() !== '';
                });
                
                // Extrair horários das batidas válidas
                const extrairHorario = (batida) => {
                    if (batida.valor && batida.valor.trim() !== '') {
                        return batida.valor.trim();
                    }
                    return null;
                };
                
                // Organizar batidas por tipo (Entrada 1, Saída 1, etc.)
                const organizarBatidas = (batidas) => {
                    const resultado = {
                        entrada1: null,
                        saida1: null,
                        entrada2: null,
                        saida2: null
                    };
                    
                    batidas.forEach(batida => {
                        if (batida.nome === 'Entrada 1') {
                            resultado.entrada1 = extrairHorario(batida);
                        } else if (batida.nome === 'Saída 1') {
                            resultado.saida1 = extrairHorario(batida);
                        } else if (batida.nome === 'Entrada 2') {
                            resultado.entrada2 = extrairHorario(batida);
                        } else if (batida.nome === 'Saída 2') {
                            resultado.saida2 = extrairHorario(batida);
                        }
                    });
                    
                    return resultado;
                };
                
                const horarios = organizarBatidas(registroDoDia.batidas);
                
                // Determinar o tipo de registro
                let tipoRegistro;
                if (batidasValidas.length === 0) {
                    tipoRegistro = 'Sem batidas';
                } else if (batidasValidas.length === 4) {
                    tipoRegistro = 'Completo';
                } else {
                    tipoRegistro = 'Incompleto';
                }
                
                return {
                    data: dataStr,
                    dataFormatada: formatarData(dia),
                    entrada1: horarios.entrada1,
                    saida1: horarios.saida1,
                    entrada2: horarios.entrada2,
                    saida2: horarios.saida2,
                    totalBatidas: batidasValidas.length,
                    completo: horarios.entrada1 && horarios.saida1 && horarios.entrada2 && horarios.saida2,
                    saldo: registroDoDia.saldo,
                    situacao: registroDoDia.situacao,
                    tipoRegistro: tipoRegistro
                };
            };
            
            // Gerar lista de dias úteis
            const diasUteis = gerarDiasUteis(mesPassado, ultimoDiaMesPassado);
            
            // Analisar cada dia útil
            const analise = diasUteis.map(dia => analisarBatidasDia(dia, registrosPonto));
            
            // Todos os dias úteis devem ser considerados para estatísticas (exceto folgas reais)
            const diasUteisFiltrados = analise.filter(dia => dia.tipoRegistro !== 'Folga');
            
            // Identificar dias com problemas
            const diasIncompletos = diasUteisFiltrados.filter(dia => !dia.completo);
            const diasSemRegistro = diasUteisFiltrados.filter(dia => dia.tipoRegistro === 'Sem dados' || dia.tipoRegistro === 'Sem batidas');
            const diasComRegistroParcial = diasUteisFiltrados.filter(dia => dia.totalBatidas > 0 && dia.totalBatidas < 4);
            
            // Gerar relatório
            const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                             'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            const mesNome = nomesMeses[mesPassado.getMonth()];
            const ano = mesPassado.getFullYear();
            
            let relatorio = `╔════════════════════════════════════════════════════════════════════════════════╗\n`;
            relatorio += `║                        RELATÓRIO DE PONTO - ${mesNome.toUpperCase()} ${ano}                         ║\n`;
            relatorio += `║                              FUNCIONÁRIO: ${nomeFuncionario.toUpperCase()}                              ║\n`;
            relatorio += `╚════════════════════════════════════════════════════════════════════════════════╝\n\n`;
            
            relatorio += `📅 Período analisado: ${dataInicio} até ${dataFim}\n`;
            relatorio += `🔗 Endpoint usado: ${endpointPonto}\n`;
            relatorio += `📊 Total de registros encontrados: ${registrosPonto.length}\n`;
            relatorio += `📋 Dias úteis no período: ${diasUteis.length}\n`;
            relatorio += `📝 Dias úteis para trabalho: ${diasUteisFiltrados.length}\n\n`;
            
            // Resumo executivo
            relatorio += `╔════════════════════════════════════════════════════════════════════════════════╗\n`;
            relatorio += `║                                RESUMO EXECUTIVO                                ║\n`;
            relatorio += `╚════════════════════════════════════════════════════════════════════════════════╝\n\n`;
            
            relatorio += `✅ Dias com registro completo (4 batidas): ${diasUteisFiltrados.filter(d => d.completo).length}\n`;
            relatorio += `🏖️ Dias de folga: ${analise.filter(d => d.tipoRegistro === 'Folga').length}\n`;
            relatorio += `⚠️  Dias com registro incompleto: ${diasComRegistroParcial.length}\n`;
            relatorio += `❌ Dias sem registro de batidas: ${diasSemRegistro.length}\n`;
            relatorio += `📊 Taxa de conformidade: ${((diasUteisFiltrados.filter(d => d.completo).length / diasUteisFiltrados.length) * 100).toFixed(1)}%\n\n`;
            
            // Detalhamento dos dias
            relatorio += `╔════════════════════════════════════════════════════════════════════════════════╗\n`;
            relatorio += `║                           DETALHAMENTO POR DIA                                 ║\n`;
            relatorio += `╚════════════════════════════════════════════════════════════════════════════════╝\n\n`;
            
            relatorio += `┌──────────────────┬──────────┬──────────┬──────────┬──────────┬─────────┬─────────────────┐\n`;
            relatorio += `│      DATA        │ ENTRADA1 │  SAÍDA1  │ ENTRADA2 │  SAÍDA2  │  SALDO  │     STATUS      │\n`;
            relatorio += `├──────────────────┼──────────┼──────────┼──────────┼──────────┼─────────┼─────────────────┤\n`;

            analise.forEach(dia => {
                const entrada1 = dia.entrada1 ? dia.entrada1.padEnd(8) : '   --   ';
                const saida1 = dia.saida1 ? dia.saida1.padEnd(8) : '   --   ';
                const entrada2 = dia.entrada2 ? dia.entrada2.padEnd(8) : '   --   ';
                const saida2 = dia.saida2 ? dia.saida2.padEnd(8) : '   --   ';
                const saldo = dia.saldo ? dia.saldo.padEnd(7) : '   --  ';
                
                let status;
                if (dia.tipoRegistro === 'Folga') {
                    status = '🏖️ FOLGA      ';
                } else if (dia.completo) {
                    status = '✅ COMPLETO    ';
                } else if (dia.tipoRegistro === 'Sem dados') {
                    status = '❌ SEM DADOS   ';
                } else if (dia.tipoRegistro === 'Sem batidas') {
                    status = '❌ SEM BATIDAS ';
                } else {
                    status = '⚠️ INCOMPLETO  ';
                }
                
                relatorio += `│ ${dia.dataFormatada.padEnd(16)} │ ${entrada1} │ ${saida1} │ ${entrada2} │ ${saida2} │ ${saldo} │ ${status} │\n`;
            });

            relatorio += `└──────────────────┴──────────┴──────────┴──────────┴──────────┴─────────┴─────────────────┘\n\n`;

            // Dias com problemas
            if (diasIncompletos.length > 0) {
                relatorio += `╔═══════════════════════════════════════════════════════════════════════════════════╗\n`;
                relatorio += `║                          DIAS QUE PRECISAM DE ATENÇÃO                             ║\n`;
                relatorio += `╚═══════════════════════════════════════════════════════════════════════════════════╝\n\n`;
                
                if (diasSemRegistro.length > 0) {
                    relatorio += `❌ DIAS SEM REGISTRO DE BATIDAS:\n`;
                    diasSemRegistro.forEach(dia => {
                        const tipoErro = dia.tipoRegistro === 'Sem dados' ? 'Sem dados no sistema' : 'Sem batidas registradas';
                        relatorio += `   • ${dia.dataFormatada} (${dia.data}) - ${tipoErro}\n`;
                    });
                    relatorio += `\n`;
                }
                
                if (diasComRegistroParcial.length > 0) {
                    relatorio += `⚠️  DIAS COM REGISTRO INCOMPLETO:\n`;
                    diasComRegistroParcial.forEach(dia => {
                        relatorio += `   • ${dia.dataFormatada} - ${dia.totalBatidas} batida(s) registrada(s)\n`;
                        if (dia.entrada1) relatorio += `     ✓ Entrada 1: ${dia.entrada1}\n`;
                        if (dia.saida1) relatorio += `     ✓ Saída 1: ${dia.saida1}\n`;
                        if (dia.entrada2) relatorio += `     ✓ Entrada 2: ${dia.entrada2}\n`;
                        if (dia.saida2) relatorio += `     ✓ Saída 2: ${dia.saida2}\n`;
                        
                        if (!dia.entrada1) relatorio += `     ❌ Falta: Entrada 1\n`;
                        if (!dia.saida1) relatorio += `     ❌ Falta: Saída 1\n`;
                        if (!dia.entrada2) relatorio += `     ❌ Falta: Entrada 2\n`;
                        if (!dia.saida2) relatorio += `     ❌ Falta: Saída 2\n`;
                        relatorio += `\n`;
                    });
                }
            } else {
                relatorio += `🎉 PARABÉNS! Todos os dias úteis têm registro completo de ponto!\n\n`;
            }
            
            // Rodapé
            relatorio += `╔════════════════════════════════════════════════════════════════════════════════╗\n`;
            relatorio += `║                                 OBSERVAÇÕES                                    ║\n`;
            relatorio += `╚════════════════════════════════════════════════════════════════════════════════╝\n\n`;
            relatorio += `• Este relatório foi gerado automaticamente em ${new Date().toLocaleString('pt-BR')}\n`;
            relatorio += `• Considera apenas dias úteis (segunda a sexta-feira)\n`;
            relatorio += `• Todos os dias úteis são exibidos, incluindo folgas e erros\n`;
            relatorio += `• Dias sem batidas são considerados ERROS, não folgas\n`;
            relatorio += `• Padrão esperado: Entrada 1, Saída 1, Entrada 2, Saída 2\n`;
            relatorio += `• Dados obtidos de: ${endpointPonto}\n`;
            relatorio += `• Total de ${registrosPonto.length} registros processados\n`;
            
            // Informar sobre folgas e erros
            const diasFolga = analise.filter(dia => dia.tipoRegistro === 'Folga');
            const diasErro = analise.filter(dia => dia.tipoRegistro === 'Sem dados' || dia.tipoRegistro === 'Sem batidas');
            
            if (diasFolga.length > 0) {
                relatorio += `• ${diasFolga.length} dia(s) de folga oficial detectados\n`;
            }
            
            if (diasErro.length > 0) {
                relatorio += `• ${diasErro.length} dia(s) com erro de registro (sem batidas)\n`;
            }
            
            // Calcular saldo total apenas dos dias úteis analisados
            const saldoTotal = diasUteisFiltrados.reduce((total, dia) => {
                if (dia.saldo && dia.saldo !== 'N/A' && !dia.saldo.includes('--')) {
                    // Converter saldo para minutos e somar
                    const match = dia.saldo.match(/([+-]?)(\d{1,2}):(\d{2})/);
                    if (match) {
                        const sinal = match[1] === '-' ? -1 : 1;
                        const horas = parseInt(match[2]);
                        const minutos = parseInt(match[3]);
                        return total + (sinal * (horas * 60 + minutos));
                    }
                }
                return total;
            }, 0);
            
            const saldoTotalFormatado = `${saldoTotal >= 0 ? '+' : ''}${Math.floor(Math.abs(saldoTotal) / 60)}:${(Math.abs(saldoTotal) % 60).toString().padStart(2, '0')}`;
            
            relatorio += `• Saldo total do período (dias úteis): ${saldoTotalFormatado}\n\n`;
            
            // Salvar relatório
            const nomeArquivo = `relatorio-ponto-${mesNome.toLowerCase()}-${ano}.txt`;
            cy.writeFile(`cypress/downloads/${nomeArquivo}`, relatorio);
            
            // Imprimir relatório no log do console
            cy.task('log', relatorio);
            
            cy.log(`📁 Relatório salvo: cypress/downloads/${nomeArquivo}`);
            cy.log(`📊 Resumo: ${diasUteisFiltrados.filter(d => d.completo).length}/${diasUteisFiltrados.length} dias completos`);
            cy.log(`📈 Saldo total: ${saldoTotalFormatado}`);
            
            if (diasIncompletos.length > 0) {
                cy.log(`⚠️ ${diasIncompletos.length} dias precisam de atenção!`);
            } else {
                cy.log(`🎉 Todos os dias úteis estão completos!`);
            }
        });
    });
});
