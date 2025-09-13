describe('PONTO ZANTHUS', () => {
    it('BATIDA DE PONTO', () => {
        // SEUS DADOS DE ACESSO
        const USUARIO = '1061';
        const SENHA = '1234';
        const RUA = 'Rua Armando Petrella'
        //const RUA = 'Rua Benjoeiro'
        // JUSTIFICATIVA POR PERIODO
        const JUSTIFICATIVA = 'Batida de ponto';
        // const JUSTIFICATIVA = 'Entrada';
        // const JUSTIFICATIVA = 'Saida Almoço';
        // const JUSTIFICATIVA = 'Volta Almoço';
        // const JUSTIFICATIVA = 'Saida';

        // GEOLOCALIZAÇÃO SUA CASA
        // const LATITUDE = '-23.52123231146921';
        // const LONGITUDE = '-46.465121813479776';

        // GEOLOCALIZAÇÃO ZANTHUS
         const LATITUDE = '-23.601801935006215';
         const LONGITUDE = '-46.699170857637';
    
        cy.visit('http://centraldofuncionario.com.br/76863/');

        // Use cy.window() para acessar a janela global do navegador
        cy.window().then((win) => {
            // Stub da função geolocation.getCurrentPosition
            cy.stub(win.navigator.geolocation, 'getCurrentPosition', (callback) => {
                callback({
                    coords: {
                        latitude: LATITUDE,
                        longitude: LONGITUDE,
                        accuracy: 10,
                        altitude: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null
                    }
                });
            });

            // Stub da função geolocation.watchPosition, se necessário
            cy.stub(win.navigator.geolocation, 'watchPosition', (callback) => {
                callback({
                    coords: {
                        latitude: LATITUDE,
                        longitude: LONGITUDE,
                        accuracy: 10,
                        altitude: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null
                    }
                });
            });
        });

        // Continue com os seus testes que dependem da geolocalização
        // cy.get('#login-banco')
        //     .clear()
        //     .type('76863')
        //     .should('have.value', '76863')
        cy.contains('ZANTHUS COMERCIO E SERVICOS LTDA.', { timeout: 30000 })
            .should('be.visible')
        cy.get('#login-numero-folha')
            .clear()
            .type(USUARIO)
            .should('have.value', USUARIO)
        cy.get('#login-senha')
            .type(SENHA)
        cy.get('#login-entrar')
            .click()
        cy.get('#aviso-cadastrar-email-botao-agora-nao', { timeout: 30000 })
            .should('have.text', 'Agora não')
        cy.get('#aviso-cadastrar-email-botao-agora-nao')
            .click();
        cy.contains(RUA, { timeout: 20000 })
            .should('be.visible')
        cy.get('#localizacao-justificativa')
            .type(JUSTIFICATIVA)
            .should('have.value', JUSTIFICATIVA)
        cy.get('#localizacao-incluir-ponto')
            .click()
        cy.get('#captura-foto-continuar', { timeout: 3000 })
            .should('have.text', 'Continuar')
            .click();
        cy.get('#video', { timeout: 3000 })
            .invoke('attr', 'src', './TelaPreta.jpg');
        cy.get('#capturar-imagem-capturar')
            .should('have.text', 'Capturar')
            .click()
        cy.get('#capturar-imagem-continuar', { timeout: 3000 })
            .should('have.text', 'Continuar')
        // // DESCOMENTAR LINHA ABAIXO ".click()" PRA REALMENTE BATER O PONTO.
        // // COM A LINHA COMENTADA FAZ TODO O PROCESSO MAS NÃO FINALIZA.
           .click()
        cy.contains('Inclusão de ponto efetuada com êxito.', { timeout: 30000 })
           .should('be.visible')
        cy.contains('Dentro de alguns instantes estará disponível em seu Cartão Ponto.', { timeout: 30000 })
          .should('be.visible')
    });
});
