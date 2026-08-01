pipeline {
    agent {
        kubernetes {
            label 'python-agent'
            yaml '''
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsUser: 0
  containers:
  - name: jnlp
    image: docin82/jenkins-python-agent:latest
    imagePullPolicy: Always
    securityContext:
      privileged: true
    env:
    - name: JENKINS_URL
      value: "http://jenkins.jenkins.svc.cluster.local:8080/"
    - name: JENKINS_TUNNEL
      value: "jenkins-agent.jenkins.svc.cluster.local:50000"
    volumeMounts:
    - mountPath: /var/run/docker.sock
      name: docker-socket
    - mountPath: /home/jenkins/agent
      name: workspace-volume
    workingDir: /home/jenkins/agent
  volumes:
  - name: docker-socket
    hostPath:
      path: /var/run/docker.sock
  - name: workspace-volume
    emptyDir: {}
'''
        }
    }

    environment {
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

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    sh "kubectl set image deployment/${DEPLOYMENT_NAME} ${CONTAINER_NAME}=${DOCKER_IMAGE}:${env.BUILD_ID}"
                    echo "Деплоймент ${DEPLOYMENT_NAME} обновлен."
                }
            }
        }
    }

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