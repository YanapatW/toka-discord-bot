pipeline {
    agent { label 'docker-agent' }

    environment {
        PROJECT_NAME = 'toka'
        COMPOSE_PROJECT_NAME = 'toka'
    }

    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/YanapatW/toka-discord-bot.git', branch: 'main'
            }
        }

        stage('Create .env from Vault') {
            steps {
                script {
                    def response = sh(
                        script: """
                            curl -sf -H "X-Vault-Token: \${VAULT_TOKEN}" \
                                http://vault:8200/v1/secret/data/toka/env
                        """,
                        returnStdout: true
                    ).trim()

                    def secrets = readJSON(text: response)
                    def data = secrets.data.data

                    def envContent = """\
# Discord Bot
DISCORD_TOKEN=${data.DISCORD_TOKEN}
DISCORD_CLIENT_ID=${data.DISCORD_CLIENT_ID}

# Gemini AI
GEMINI_API_KEY=${data.GEMINI_API_KEY}

# PostgreSQL
POSTGRES_USER=${data.POSTGRES_USER}
POSTGRES_PASSWORD=${data.POSTGRES_PASSWORD}
POSTGRES_DB=${data.POSTGRES_DB}
DATABASE_URL=postgresql://${data.POSTGRES_USER}:${data.POSTGRES_PASSWORD}@db:5432/${data.POSTGRES_DB}
"""
                    writeFile file: '.env', text: envContent
                }
            }
        }

        stage('Build') {
            steps {
                sh 'docker compose build --no-cache'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose down || true'
                sh 'docker compose up -d'
            }
        }

        stage('Health Check') {
            steps {
                sh 'sleep 10'
                sh 'docker compose ps'
                sh 'docker compose logs --tail 20 bot'
            }
        }
    }

    post {
        always {
            sh 'rm -f .env'
        }
        failure {
            sh 'docker compose logs --tail 50 || true'
        }
    }
}
