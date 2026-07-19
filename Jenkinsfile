pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'docin82/cat-bot'
        DEPLOYMENT_NAME = 'cat-bot'
        VENV_PATH = 'venv'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Код успешно склонирован!"
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
                    # python -m unittest discover tests || echo "Тесты не найдены или пропущены"
                '''
                echo "Тесты пропущены (или пройдены)."
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    withEnv(["PATH+VENV=${env.WORKSPACE}/${VENV_PATH}/bin"]) {
                        def image = docker.build("${DOCKER_IMAGE}:${env.BUILD_ID}")
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

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    sh "kubectl set image deployment/${DEPLOYMENT_NAME} ${DEPLOYMENT_NAME}=${DOCKER_IMAGE}:${env.BUILD_ID}"
                    echo "Деплоймент ${DEPLOYMENT_NAME} обновлен."
                }
            }
        }
    }

    post {
        always {
            sh "rm -rf ${VENV_PATH}" || echo "Очистка пропущена"
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
