pipeline {
    agent any

    // Requires Jenkins plugins: NodeJS, HTML Publisher, JUnit, Allure (with an Allure Commandline tool configured).
    // Configure a NodeJS installation named 'node22' under Manage Jenkins > Tools.
    tools { nodejs 'node22' }

    parameters {
        string(name: 'BASE_URL', defaultValue: 'https://uma-candles.vercel.app', description: 'Application URL under test')
        string(name: 'GREP', defaultValue: '', description: 'Run only tests matching this tag/title (e.g. @smoke)')
    }

    environment {
        CI = 'true'
        BASE_URL = "${params.BASE_URL}"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps chromium'
            }
        }

        stage('Test') {
            steps {
                script {
                    def grepArg = params.GREP?.trim() ? "--grep \"${params.GREP}\"" : ''
                    sh 'npm run allure:clean'
                    sh "npx playwright test ${grepArg}"
                }
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'reports/junit/results.xml'
            publishHTML(target: [
                reportName           : 'Playwright Report',
                reportDir            : 'reports/html',
                reportFiles          : 'index.html',
                keepAll              : true,
                alwaysLinkToLastBuild: true,
                allowMissing         : true
            ])
            allure includeProperties: false, results: [[path: 'reports/allure-results']]
            archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
        }
    }
}
