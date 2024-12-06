# Laboratório Experimental - Sistemas de Informação ESPM

<p align="center">
    <a href="https://www.espm.br/cursos-de-graduacao/sistemas-de-informacao/"><img src="https://raw.githubusercontent.com/tech-espm/misc-template/main/logo.png" alt="Sistemas de Informação ESPM" style="width: 375px;"/></a>
</p>

# Gerenciador de Visitas a Ambientes Virtuais

### 2024-02

## Integrantes
- [Alex Macedo](https://github.com/Alexxmfs)
- [Henrique Sardella](https://github.com/henrique-sdc)

## Cliente do Projeto

ESPM

## Descrição do Projeto

Sistema para criação e gerenciamento de tours virtuais por instalações físicas reais, por meio de imagens em 360°, através de computadores, dispositivos móveis ou óculos de realidade virtual.

# Detalhes de Configuração

Para funcionar corretamente, devem ser criados os seguintes arquivos/pastas nos caminhos especificados, com o conteúdo especificado:

- O arquivo `.env` deve ser criado em `/`, com o conteúdo abaixo:
```
app_localIp=127.0.0.1
app_port=3000
app_root=
# Não pode terminar com barra /
app_urlSite=http://localhost:3000
app_cookie=[NOME DO COOKIE]
app_cookieSecure=0
app_staticFilesDir=public
app_disableStaticFiles=0
app_sqlConfig_connectionLimit=30
app_sqlConfig_waitForConnections=1
app_sqlConfig_charset=utf8mb4
app_sqlConfig_host=[HOST DO BANCO]
app_sqlConfig_port=[PORTA DO BANCO]
app_sqlConfig_user=[USUÁRIO DO BANCO]
app_sqlConfig_password=[SENHA DO USUÁRIO DO BANCO]
app_sqlConfig_database=[NOME DO BANCO]
# Não utilizar números > 0x7FFFFFFF pois os XOR resultarão em -1
app_usuarioHashId=[HASH DE 32 BITS PARA O ID EM HEXADECIMAL, COMO 0x1234ABCD]
app_pastaLocais=[NOME DA PASTA ONDE ARMAZENAR AS IMAGENS]
```

- A pasta especificada na configuração `app_pastaLocais` deve ser criada em `/public/img`

# Licença

Este projeto é licenciado sob a [MIT License](https://github.com/tech-espm/labs-visita-virtual/blob/main/LICENSE).

<p align="right">
    <a href="https://www.espm.br/cursos-de-graduacao/sistemas-de-informacao/"><img src="https://raw.githubusercontent.com/tech-espm/misc-template/main/logo-si-512.png" alt="Sistemas de Informação ESPM" style="width: 375px;"/></a>
</p>
