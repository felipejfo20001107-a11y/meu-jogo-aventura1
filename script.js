const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('levelDisplay');

// === IMAGENS VETORIAIS (SVGs) NATIVAS ===
// Criadas diretamente no código para escapar definitivamente dos bloqueios de internet!

function createSvg(svgString) {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    return img;
}

const imgPlayer = new Image(); imgPlayer.src = 'assets/player.png';
const imgSpider = new Image(); imgSpider.src = 'assets/spider.png';
const imgWasp = new Image(); imgWasp.src = 'assets/bee.png';
const imgRock = new Image(); imgRock.src = 'assets/rock.png';
const imgChest = new Image(); imgChest.src = 'assets/chest.png';
const imgStar = createSvg('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="50,15 61,38 85,38 66,53 73,76 50,61 27,76 34,53 15,38 39,38" fill="#f1c40f" stroke="#f39c12" stroke-width="2"/></svg>');
const imgPower = createSvg('<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="55,10 25,50 45,50 40,90 75,40 50,40" fill="#9b59b6" stroke="#8e44ad" stroke-width="3"/></svg>');
let gameState = 'playing'; // Pode ser 'playing', 'won', 'lost', 'finished'
let faseAtual = 1;
const MAX_FASES = 20;
let jogoIniciado = false; // Flag para segurar os inimigos no início do nível

let vidas = 3;
let pontuacao = 0;
const livesDisplay = document.getElementById('livesDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');

// Nosso personagem (Herói)
const player = {
    x: 40,
    y: 320,
    width: 30, // Deixei um pouco menor para passar nos espaços
    height: 30,
    color: '#3498db',
    speed: 4,
    dx: 0,
    dy: 0,
    isInvincible: false
};

// O Baú de Tesouro (Objetivo Final)
const chest = {
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    color: '#f1c40f' // Amarelo Dourado
};

// Configurações do Cérebro dos Inimigos e Itens
let rocks = [];
let enemies = [];
let stars = []; // Coletáveis para a pontuação
let powerUp = null; // Item de Invencibilidade

// Função que gera a fase de acordo com o nível da dificuldade
function carregarFase(nivel) {
    rocks = [];
    enemies = [];
    levelDisplay.innerText = `Fase ${nivel} / ${MAX_FASES}`;

    // Sortear a Posição do Baú! (A cada nova fase ou restart)
    // Garantir que não nasça em cima do jogador e fique de preferência nas posições de grade (múltiplos de 40)
    do {
        chest.x = Math.floor(Math.random() * 9) * 40 + 20; // Posição de 20 a 340
        chest.y = Math.floor(Math.random() * 9) * 40 + 20;
    } while (chest.x < 160 && chest.y > 240); // Longe de onde o jogador inicia (40, 320)

    // Mais pedras para dificultar e formar um labirinto caótico
    let maxPedras = 5 + Math.floor(nivel * 1.5);
    for (let i = 0; i < maxPedras; i++) {
        let rx = Math.floor(Math.random() * 9) * 40 + 20;
        let ry = Math.floor(Math.random() * 9) * 40 + 20;

        let novaPedra = { x: rx, y: ry, width: 40, height: 40 };

        // Não criar pedra na posição inicial do jogador e nem cobrir o baú
        if ((rx < 120 && ry > 240) || checkCollision(novaPedra, chest)) {
            continue;
        }

        rocks.push(novaPedra);
    }

    // Função interna para testar se uma posição para inimigo está livre de pedras e do jogador inicial
    function isFree(rect) {
        if (rect.x < 120 && rect.y > 240) return false; // Zona inicial do player
        if (checkCollision(rect, chest)) return false;  // Em cima do bau
        for (let r of rocks) {
            if (checkCollision(rect, r)) return false; // Em cima de uma pedra
        }
        return true;
    }

    // Inimigos com Movimento Aleatório Bidirecional (Eles rebatem nas paredes)
    let maxAranhas = 1 + Math.floor(nivel / 2);
    for (let i = 0; i < maxAranhas; i++) {
        let speed = 1.5 + (nivel * 0.15); // velocidade base
        let angle = Math.random() * Math.PI * 2; // Direção apontando para qualquer lugar (360 graus)
        let ex, ey;

        do {
            ex = 20 + Math.floor(Math.random() * 300);
            ey = 20 + Math.floor(Math.random() * 300);
        } while (!isFree({ x: ex, y: ey, width: 25, height: 25 }));

        enemies.push({
            type: 'spider', x: ex, y: ey, width: 25, height: 25,
            color: '#2c3e50', dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed
        });
    }

    // Vespas (ainda mais rápidas e com movimentos loucos)
    let maxVespas = Math.floor(nivel / 3);
    for (let i = 0; i < maxVespas; i++) {
        let speed = 2.5 + (nivel * 0.25);
        let angle = Math.random() * Math.PI * 2; // Diagonal
        let ex, ey;

        do {
            ex = 20 + Math.floor(Math.random() * 300);
            ey = 20 + Math.floor(Math.random() * 300);
        } while (!isFree({ x: ex, y: ey, width: 20, height: 20 }));

        enemies.push({
            type: 'wasp', x: ex, y: ey, width: 20, height: 20,
            color: '#e67e22', dx: Math.cos(angle) * speed, dy: Math.sin(angle) * speed
        });
    }
}

// Inicia a primeira fase logo que a tela carregar
carregarFase(faseAtual);

// Função que checa se dois quadrados estão batendo (Colisão AABB)
function checkCollision(rect1, rect2) {
    if (rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.height + rect1.y > rect2.y) {
        return true;
    }
    return false;
}

// Desenhar o cenário e os personagens usando Imagens!
function draw() {
    clear();

    // Desenhar o Baú
    ctx.drawImage(imgChest, chest.x, chest.y, chest.width, chest.height);

    // Desenhar Pedras
    rocks.forEach(rock => {
        ctx.drawImage(imgRock, rock.x, rock.y, rock.width, rock.height);
    });

    // Desenhar Estrelinhas (Moedas)
    stars.forEach(star => {
        if (!star.collected) {
            ctx.drawImage(imgStar, star.x, star.y, star.width, star.height);
        }
    });

    // Desenhar Power-Up (Raio / Porção)
    if (powerUp && !powerUp.collected) {
        ctx.drawImage(imgPower, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
    }

    // Desenhar Inimigos
    enemies.forEach(enemy => {
        if (enemy.type === 'spider') {
            ctx.drawImage(imgSpider, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            ctx.drawImage(imgWasp, enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });

    // Desenhar o Jogador
    if (player.isInvincible) {
        // Efeito de escudo/piscar: Desenhamos um halo de luz dourado atrás dele
        ctx.fillStyle = (Math.floor(Date.now() / 150) % 2 === 0) ? 'rgba(255, 235, 59, 0.8)' : 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.drawImage(imgPlayer, player.x, player.y, player.width, player.height);
}

// Limpar a tela
function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Atualizar posições (LÓGICA DO JOGO)
function update() {
    if (gameState !== 'playing') return; // Se acabou o jogo, para de mover tudo!

    // === MOVIMENTO DO JOGADOR COM COLISÃO NA PAREDE ===
    let newX = player.x + player.dx;
    let newY = player.y + player.dy;

    // Impedir de sair da tela
    if (newX < 0) newX = 0;
    if (newX + player.width > canvas.width) newX = canvas.width - player.width;
    if (newY < 0) newY = 0;
    if (newY + player.height > canvas.height) newY = canvas.height - player.height;

    // === CHECAR COLISÃO COM PEDRAS (Obstáculos) ===
    let bateuNaPedra = false;
    // Criamos um "jogador imaginário" na nova posição para testar a colisão antes de mover
    let phantomPlayer = { x: newX, y: newY, width: player.width, height: player.height };

    for (let rock of rocks) {
        if (checkCollision(phantomPlayer, rock)) {
            bateuNaPedra = true;
            break; // Já sabemos que bateu, não precisa checar as outras
        }
    }

    // Se NÃO bateu, nós realmente movemos o jogador de verdade
    if (!bateuNaPedra) {
        player.x = newX;
        player.y = newY;
    }

    // === MOVIMENTO ALEATÓRIO DOS INIMIGOS (Bate-e-Volta Melhorado) ===
    enemies.forEach(enemy => {
        if (!jogoIniciado) return; // Inimigos aguardam o jogador começar a se mover!

        // --- 1. MOVER NO EIXO X (Horizontal) ---
        let nextEx = enemy.x + enemy.dx;
        let colidiuX = false;

        // Bateu nas paredes laterais da tela (Cravando o inimigo exatamente contra a borda para não sobrar espaço)
        if (nextEx <= 0) {
            enemy.x = 0;
            enemy.dx *= -1;
            colidiuX = true;
        } else if (nextEx + enemy.width >= canvas.width) {
            enemy.x = canvas.width - enemy.width;
            enemy.dx *= -1;
            colidiuX = true;
        } else {
            // Testar bater nas pedras no eixo X
            let phantomX = { x: nextEx, y: enemy.y, width: enemy.width, height: enemy.height };
            for (let rock of rocks) {
                if (checkCollision(phantomX, rock)) {
                    enemy.dx *= -1;
                    colidiuX = true;
                    break;
                }
            }
        }

        if (!colidiuX) enemy.x = nextEx;

        // --- 2. MOVER NO EIXO Y (Vertical) ---
        let nextEy = enemy.y + enemy.dy;
        let colidiuY = false;

        // Bateu no teto ou chão da tela (Cravando o inimigo na extremidade)
        if (nextEy <= 0) {
            enemy.y = 0;
            enemy.dy *= -1;
            colidiuY = true;
        } else if (nextEy + enemy.height >= canvas.height) {
            enemy.y = canvas.height - enemy.height;
            enemy.dy *= -1;
            colidiuY = true;
        } else {
            // Testar bater nas pedras no eixo Y
            let phantomY = { x: enemy.x, y: nextEy, width: enemy.width, height: enemy.height };
            for (let rock of rocks) {
                if (checkCollision(phantomY, rock)) {
                    enemy.dy *= -1;
                    colidiuY = true;
                    break;
                }
            }
        }

        if (!colidiuY) enemy.y = nextEy;

        // === CHECAR SE INIMIGO TOCOU NO JOGADOR ===
        if (checkCollision(player, enemy)) {
            if (!player.isInvincible) {
                gameOver("Você foi pego! 🕷️🐝");
            } else {
                // Se estiver invencível, ele MATA o inimigo ao encostar (Jogando-o para fora da tela)
                enemy.x = -1000;
                pontuacao += 100; // E ainda ganha 100 pontos por esmagar o bicho!
                if (scoreDisplay) scoreDisplay.innerText = "Pontos: " + pontuacao;
            }
        }
    });

    // === CHECAR COLETA DE ESTRELAS E POWERUP ===
    stars.forEach(star => {
        if (!star.collected && checkCollision(player, star)) {
            star.collected = true; // Desaparece no próximo frame
            pontuacao += 50;       // Ganha 50 pontos
            if (scoreDisplay) scoreDisplay.innerText = "Pontos: " + pontuacao;
        }
    });

    if (powerUp && !powerUp.collected && checkCollision(player, powerUp)) {
        powerUp.collected = true;
        player.isInvincible = true;
        pontuacao += 200;
        if (scoreDisplay) scoreDisplay.innerText = "Pontos: " + pontuacao;

        // Remove a invencibilidade após 6 segundos
        setTimeout(() => { player.isInvincible = false; }, 6000);
    }

    // === CHECAR VITÓRIA (Tocou no Baú) ===
    if (checkCollision(player, chest)) {
        if (faseAtual < MAX_FASES) {
            proximaFase();
        } else {
            gameWon(); // Apenas no nível 20 é Vitória Absoluta!
        }
    }
}

function proximaFase() {
    gameState = 'won'; // Pausa por um segundinho
    setTimeout(() => {
        faseAtual++;
        carregarFase(faseAtual);
        player.x = 40;
        player.y = 320;
        player.dx = 0;
        player.dy = 0;
        jogoIniciado = false; // Pausa inimigos de novo
        gameState = 'playing';
    }, 500); // Meio segundo de delay entre as fases
}

function gameOver(mensagem) {
    gameState = 'lost';
    vidas--;

    // Se não houver o elemento no DOM, não faz nada para evitar erro
    if (livesDisplay) {
        let coracaoStr = "";
        for (let i = 0; i < vidas; i++) coracaoStr += "❤️ ";
        livesDisplay.innerText = "Vidas: " + coracaoStr;
    }

    setTimeout(() => {
        if (vidas > 0) {
            alert("Aí! Você perdeu uma vida. Restam: " + vidas + ". Cuidado na próxima vez!");
            resetPlayer();
        } else {
            alert(mensagem + "\nA dificuldade estava na Fase " + faseAtual + ".\nSuas vidas acabaram. Clique em OK para recomeçar!");
            vidas = 3;
            pontuacao = 0;
            faseAtual = 1;

            if (livesDisplay) livesDisplay.innerText = "Vidas: ❤️ ❤️ ❤️";
            if (scoreDisplay) scoreDisplay.innerText = "Pontos: " + pontuacao;

            carregarFase(faseAtual);
            resetPlayer();
        }
    }, 100);
}

function gameWon() {
    gameState = 'finished'; // Estado novo para tela final
    setTimeout(() => {
        alert("🎉 PARABÉNS! VOCÊ COMPLETOU AS 20 FASES! 🎉\nO maior mestre do labirinto!");
        faseAtual = 1; // Zera para próxima jogatina
        carregarFase(faseAtual);
        resetPlayer();
    }, 100);
}

function resetPlayer() {
    player.x = 40;
    player.y = 320;
    player.dx = 0;
    player.dy = 0;
    player.isInvincible = false; // Tira o escudo ao errar
    jogoIniciado = false; // Pausa inimigos de novo
    gameState = 'playing';
}

// O LUP DO JOGO
function gameLoop() {
    update(); // Primeiro calcula todos os movimentos e colisões
    draw();   // Depois desenha a cena atualizada
    requestAnimationFrame(gameLoop);
}

// --- CONTROLES DO JOGADOR ---

function moveUp() { if (gameState === 'playing') { player.dy = -player.speed; jogoIniciado = true; } }
function moveDown() { if (gameState === 'playing') { player.dy = player.speed; jogoIniciado = true; } }
function moveLeft() { if (gameState === 'playing') { player.dx = -player.speed; jogoIniciado = true; } }
function moveRight() { if (gameState === 'playing') { player.dx = player.speed; jogoIniciado = true; } }
function stopX() { player.dx = 0; }
function stopY() { player.dy = 0; }

// Ouvindo o teclado (Cima, Baixo, Esquerda, Direita ou W, A, S, D)
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveUp();
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveDown();
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveLeft();
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveRight();
});

// Quando soltar o botão, o personagem para de andar
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'w' || e.key === 's' || e.key === 'W' || e.key === 'S') stopY();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd' || e.key === 'A' || e.key === 'D') stopX();
});

// Controles pelo Celular (Toque na tela)
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

// Iniciar o movimento ao tocar
btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); moveUp(); }, { passive: false });
btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); moveDown(); }, { passive: false });
btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); moveLeft(); }, { passive: false });
btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); moveRight(); }, { passive: false });

// Parar o movimento ao soltar o dedo
btnUp.addEventListener('touchend', (e) => { e.preventDefault(); stopY(); }, { passive: false });
btnDown.addEventListener('touchend', (e) => { e.preventDefault(); stopY(); }, { passive: false });
btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); stopX(); }, { passive: false });
btnRight.addEventListener('touchend', (e) => { e.preventDefault(); stopX(); }, { passive: false });

// Dar o pontapé inicial no jogo!
gameLoop();
