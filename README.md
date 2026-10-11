
# Origon58 Evolução #005

Cofre local para guardar textos e fotos com criptografia, exportar itens em arquivos `.enc` e recuperá-los posteriormente.

## Funcionalidades

- Configuração inicial com três senhas de acesso.
- Abertura do cofre usando as credenciais configuradas.
- Criação de itens com texto, foto ou texto acompanhado de foto.
- Proteção individual dos itens com senha própria.
- Confirmação da senha individual antes da criptografia.
- Criptografia dos dados com Web Crypto API.
- Exportação dos itens criptografados em arquivos `.enc`.
- Importação de arquivos `.enc` e descriptografia com a senha correspondente.
- Exibição do texto e da foto após a descriptografia.
- Armazenamento local no navegador.
- Cache de arquivos para permitir o acesso offline depois que o aplicativo for carregado e armazenado em cache.

## Tecnologias

- HTML
- CSS
- JavaScript
- Web Crypto API
- localStorage
- Service Worker
- Cache API
- Progressive Web App (PWA)

## Armazenamento

Os itens do cofre são guardados localmente no navegador. Não há banco de dados remoto configurado neste projeto.

Os dados armazenados em um navegador não são sincronizados automaticamente com outros dispositivos. Limpar os dados do navegador pode apagar o cofre local.

Os arquivos `.enc` permitem exportar itens criptografados para recuperação posterior. Guarde os arquivos e suas senhas em locais seguros.

## Criptografia

A aplicação utiliza recursos criptográficos do navegador para proteger os dados.

A senha de cada item deve ser guardada com cuidado. Se ela for perdida, talvez não seja possível recuperar o conteúdo daquele arquivo.

A criptografia não substitui cópias de segurança. Mantenha cópias dos arquivos exportados em local seguro.

## Execução

1. Publique os arquivos em um repositório GitHub.
2. Ative o GitHub Pages nas configurações do repositório.
3. Abra o endereço HTTPS publicado.
4. Faça a configuração inicial.
5. Crie um item de teste e exporte o arquivo `.enc`.
6. Importe o arquivo e confirme se o conteúdo pode ser recuperado.

## Funcionamento offline

O Service Worker armazena os arquivos da aplicação em cache. O acesso offline depende de uma primeira carga bem-sucedida e de os arquivos necessários estarem disponíveis no cache.

O cache offline não é um backup dos itens armazenados no localStorage.

## Limite de fotos

O JavaScript da aplicação deve definir e validar o limite de tamanho das fotos. O limite aplicado pela interface não garante que todos os dispositivos tenham espaço suficiente para armazenar os dados.

## Segurança e cuidados

- Não compartilhe suas senhas.
- Teste a exportação e a recuperação com dados sem importância antes de guardar informações reais.
- Não confie apenas no armazenamento local como cópia de segurança.
- Evite apagar os dados do navegador sem antes confirmar que os arquivos necessários foram exportados.
- Use uma conexão HTTPS para disponibilizar os recursos criptográficos exigidos pelo navegador.

## Projeto

Origon58 Evolução #005 — projeto pessoal de armazenamento local e recuperação de dados criptografados.
