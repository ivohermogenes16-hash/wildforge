// Bancos de nomes para gerar jogadores das divisões de baixo, sub-20, técnicos e base
export const NAMES = {
  BR: {
    first: 'Gabriel Lucas Matheus Pedro Guilherme Rafael Felipe Gustavo João Vitor Bruno Thiago Leonardo Rodrigo Diego Caio Igor Daniel Eduardo Henrique Kaique Wesley Luan Breno Murilo Vinícius André Renan Yuri Davi Enzo Arthur Samuel Ryan Kauã Erick Nicolas Juan Marcos Paulo Alex Douglas Jefferson Anderson Wellington Everton Willian Fabrício Lucca Otávio Kevin Cauã Jonathan Robson Fernando Ramon Hugo Heitor Pietro Ruan Alisson Danilo Emerson Marlon Patrick Raí Dudu Lipe'.split(' '),
    last: 'Silva Santos Oliveira Souza Lima Pereira Ferreira Costa Rodrigues Almeida Nascimento Araújo Ribeiro Carvalho Gomes Martins Rocha Barbosa Alves Moura Cardoso Teixeira Correia Dias Mendes Pinto Freitas Castro Batista Moreira Monteiro Lopes Vieira Ramos Machado Nunes Fonseca Cunha Campos Tavares Farias Medeiros Brito Sales Queiroz Pires Duarte Viana Rezende Andrade Borges Coelho Siqueira Bastos Prado'.split(' '),
    nick: 'Pedrinho Juninho Zé Rafael Léo Jean Dedé Tinga Biro Caju Netinho Marquinhos Neguinho Gilberto Cacá Fabinho Toninho Didi Kaio Nenê Talles Bidu Jajá Pablo Wendel Paulinho Rodriguinho Luizão Tiaguinho Bruninho Guga Tchê Índio Lelê Joãozinho Deco Biel Mateusinho Vitinho Davizinho'.split(' '),
  },
  EN: {
    first: 'Jack Harry George Oliver Charlie Thomas James William Joe Callum Lewis Ryan Kyle Jordan Liam Connor Ben Sam Josh Tom Alfie Archie Jake Luke Reece Mason Ethan Owen Dan Max Toby Rhys Kieran Jamie Scott Nathan Aaron Billy Tyler Elliot'.split(' '),
    last: 'Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green Hall Wood Jackson Clarke Hughes Edwards Turner Hill Moore Cooper Ward Morris King Watson Harrison Morgan Baker Young Allen Mitchell Bell Kelly Barnes Fletcher'.split(' '),
  },
  ES: {
    first: 'Álvaro Pablo Sergio Javier Alejandro Daniel Adrián David Carlos Mario Iker Unai Hugo Marcos Rubén Diego Raúl Jorge Íñigo Aitor Óscar Víctor Gonzalo Asier Mikel Jon Rodrigo Martín Nacho Dani Pol Arnau Joel Marc Eric Gerard Borja Álex Jaime Manu'.split(' '),
    last: 'García Fernández González Rodríguez López Martínez Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno Álvarez Muñoz Romero Alonso Gutiérrez Navarro Torres Domínguez Vázquez Ramos Gil Serrano Blanco Molina Castro Ortega Rubio Marín Sanz Iglesias Medina Garrido Cortés Castillo Lozano'.split(' '),
  },
  IT: {
    first: 'Francesco Alessandro Lorenzo Andrea Matteo Leonardo Gabriele Riccardo Davide Tommaso Federico Giuseppe Marco Luca Simone Nicolò Stefano Antonio Mattia Edoardo Filippo Pietro Daniele Giacomo Christian Samuele Alessio Fabio Michele Emanuele Giorgio Paolo Manuel Kevin Cristian Salvatore Roberto Vincenzo Diego Nicola'.split(' '),
    last: 'Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De Luca Mancini Costa Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi Caruso Ferrara Galli Martini Leone Longo Gentile Martinelli Vitale Lombardo Serra Coppola De Santis Fabbri Bellini'.split(' '),
  },
  AR: {
    first: 'Santiago Mateo Juan Facundo Nicolás Matías Agustín Tomás Lautaro Thiago Franco Joaquín Gonzalo Ezequiel Ramiro Leandro Maximiliano Lucas Emiliano Valentín Bruno Federico Gastón Cristian Marcos Kevin Iván Julián Rodrigo Brian Alan Nahuel Braian Lucio Enzo Benjamín Ignacio Fausto Axel Gabriel'.split(' '),
    last: 'González Rodríguez Gómez Fernández López Díaz Martínez Pérez Romero Sosa Álvarez Torres Ruiz Ramírez Flores Benítez Acosta Medina Herrera Suárez Aguirre Giménez Gutiérrez Pereyra Rojas Molina Castro Ortiz Silva Núñez Luna Juárez Cabrera Ríos Ferreyra Godoy Morales Domínguez Moreno Peralta'.split(' '),
  },
};

// Nacionalidades estrangeiras usadas como "tempero" nos elencos gerados
export const FOREIGN = { BR: ['AR', 'ES'], EN: ['ES', 'IT', 'BR'], ES: ['AR', 'BR', 'IT'], IT: ['ES', 'BR', 'AR'], AR: ['BR', 'ES'] };

export const VARZEA = ['Unidos da Vila', 'Estrela do Norte', 'Real Periferia', 'Grêmio Recreativo Boa Vista', 'Juventus da Mooca Alta', 'Botafogo do Morro', 'Ponte do Rio', 'Sete de Setembro', 'Atlético Jardim', 'Leões da Serra', 'União Operária', 'Esporte Clube Bairro Novo'];
