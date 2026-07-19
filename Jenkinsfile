pipeline {
    agent any

    environment {
        // Имя вашего образа в Docker Hub
        DOCKER_IMAGE = 'docin82/jenkins-custom'
        // Имя вашего деплоймента в Kubernetes
        DEPLOYMENT_NAME = 'cat-bot'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Код успешно склонирован!"
            }
        }

        stage('Setup') {
            steps {
                sh 'python3 -m pip install -r requirements.txt'
                echo "Зависимости установлены."
            }
        }

        stage('Test') {
            steps {
                // Если у вас есть тесты, раскомментируйте следующую строку
                // sh 'python3 -m unittest discover tests'
                echo "Тесты пропущены (или пройдены)."
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Собираем образ с тегом, содержащим номер сборки
                   def image = docker.build("docin82/jenkins-custom:${env.BUILD_ID}")
                    echo "Образ ${DOCKER_IMAGE}:${env.BUILD_ID} собран."
                }
            }
        }

        stage('Push to Registry') {
            steps {
                script {
                    // Загружаем образ в Docker Hub
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
                    // Обновляем образ в существующем Deployment
                    sh "kubectl set image deployment/${DEPLOYMENT_NAME} ${DEPLOYMENT_NAME}=${DOCKER_IMAGE}:${env.BUILD_ID}"
                    echo "Деплоймент ${DEPLOYMENT_NAME} обновлен."
                }
            }
        }
    }

    post {
        always {
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
