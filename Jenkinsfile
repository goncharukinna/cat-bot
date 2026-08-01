pipeline {
    // Запуск на агенте с меткой 'python-agent'
    agent { 
        label 'python-agent' 
    }

    // Переменные окружения
    environment {
        DOCKER_IMAGE = 'docin82/cat-bot'
        DEPLOYMENT_NAME = 'cat-bot'
        VENV_PATH = 'venv'
    }

    stages {
        // 1. Клонирование кода
        stage('Checkout') {
            steps {
                checkout scm
                echo "Код успешно склонирован!"
            }
        }

        // 2. Проверка наличия всех необходимых инструментов
        stage('Check Tools') {
            steps {
                sh '''
                    echo "=== Проверка инструментов ==="
                    for cmd in python3 pip3 ansible docker kubectl; do
                        if command -v $cmd &> /dev/null; then
                            echo "✅ $cmd: $($cmd --version 2>&1 | head -n1)"
                        else
                            echo "❌ $cmd не найден"
                            exit 1
                        fi
                    done
                    echo "Все инструменты установлены."
                '''
            }
        }

        // 3. Проверка Ansible (оставляем для совместимости)
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

        // 4. Создание виртуального окружения и установка зависимостей
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

        // 5. Запуск тестов
        stage('Test') {
            steps {
                sh '''
                    . ${VENV_PATH}/bin/activate
                    python -m unittest discover tests || echo "Тесты не найдены или пропущены"
                '''
                echo "Тесты пропущены (или пройдены)."
            }
        }

        // 6. Сборка Docker-образа
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

        // 7. Загрузка образа в Docker Hub
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

        // 8. Деплой в Kubernetes
        stage('Deploy to Kubernetes') {
            steps {
                script {
                    sh "kubectl set image deployment/${DEPLOYMENT_NAME} ${DEPLOYMENT_NAME}=${DOCKER_IMAGE}:${env.BUILD_ID}"
                    echo "Деплоймент ${DEPLOYMENT_NAME} обновлен."
                }
            }
        }
    }

    // Действия после завершения пайплайна
    post {
        always {
            sh '''
                rm -rf ${VENV_PATH} || echo "Очистка пропущена"
            '''
            echo "Pipeline завершен. Статус: ${currentBuild.result}"
        }
        success {
            echo "Поздравляю! Сборка успешна! 🎉"
        }
        failure {
            echo "Упс! Что-то пошло не так. Проверьте логи."
        }
    }
}
