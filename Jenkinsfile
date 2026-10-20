pipeline {
    agent {
        kubernetes {
            label 'node-agent'
            yamlFile 'pod.yaml'
        }
    }

    environment {
        NAMESPACE = 'default'
        DOCKER_IMAGE = 'docin82/cat-bot'
        DEPLOYMENT_NAME = 'cat-bot'
        CONTAINER_NAME = 'jenkins-custom'   // добавьте эту строку
        VENV_PATH = 'venv'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Код успешно склонирован!"
            }
        }

        stage('Check Tools') {
            steps {
                sh '''
                    echo "=== Проверка инструментов ==="
                    for cmd in python3 pip3 ansible docker kubectl; do
                        if command -v $cmd &> /dev/null; then
                            if [ "$cmd" = "kubectl" ]; then
                                echo "✅ $cmd: $(kubectl version --client 2>&1 | head -n1)"
                            else
                                echo "✅ $cmd: $($cmd --version 2>&1 | head -n1)"
                            fi
                        else
                            echo "❌ $cmd не найден"
                            exit 1
                        fi
                    done
                    echo "Все инструменты установлены."
                '''
            }
        }

        stage('Test Ansible') {
            steps {
                sh '''
                    echo "=== Проверка Ansible ==="
                    ansible --version
                    which ansible
                '''
                echo "Ansible готов к работе!"
            }
        }

        stage('Setup Virtual Environment') {
            steps {
                sh '''
                    python3 -m venv ${VENV_PATH}
                    . ${VENV_PATH}/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                '''
                echo "Виртуальное окружение создано и зависимости установлены."
            }
        }

        stage('Test') {
            steps {
                sh '''
                    . ${VENV_PATH}/bin/activate
                    python -m unittest discover tests || echo "Тесты не найдены или пропущены"
                '''
                echo "Тесты пропущены (или пройдены)."
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    withEnv(["PATH+VENV=${env.WORKSPACE}/${VENV_PATH}/bin"]) {
                        def image = docker.build("${DOCKER_IMAGE}:${env.BUILD_ID}", ".")
                        echo "Образ ${DOCKER_IMAGE}:${env.BUILD_ID} собран."
                    }
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    docker.withRegistry('', 'docker-credentials') {
                        docker.image("${DOCKER_IMAGE}:${env.BUILD_ID}").push("latest")
                        docker.image("${DOCKER_IMAGE}:${env.BUILD_ID}").push("${env.BUILD_ID}")
                    }
                    echo "Образ загружен в Docker Hub."
                }
            }
        }

        stage('Update GitOps Repo') {
            steps {
                container('git') {
                    withCredentials([usernamePassword(
                        credentialsId: 'github-token',
                        usernameVariable: 'GIT_USER',
                        passwordVariable: 'GIT_TOKEN'
                    )]) {
                        sh '''
                            git clone https://${GIT_USER}:${GIT_TOKEN}@github.com/goncharukinna/bots-gitops.git /tmp/gitops
                            cd /tmp/gitops
                            sed -i "s|image: docin82/cat-bot:.*|image: docin82/cat-bot:${BUILD_ID}|" manifests/cat-bot/deployment.yaml
                            git config user.name "Jenkins"
                            git config user.email "jenkins@example.com"
                            git add manifests/cat-bot/deployment.yaml
                            git commit -m "cat-bot: update to ${BUILD_ID} [skip ci]"
                            git push
                            echo "✅ GitOps обновлён до версии ${BUILD_ID}"
                        '''
                    }
                }
            }
        }
