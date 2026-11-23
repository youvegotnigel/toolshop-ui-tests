// Declarative pipeline mirroring .github/workflows/ci.yml.
// Needs: Docker Pipeline, JUnit, HTML Publisher plugins (Allure Jenkins plugin optional).
// Credentials (Secret text): toolshop-admin-password.
// The Playwright image matches @playwright/test in package.json: bump both together.
pipeline {
  agent {
    docker {
      image 'mcr.microsoft.com/playwright:v1.65.1-noble'
      args '-u root --ipc=host'
    }
  }

  parameters {
    choice(name: 'TEST_ENV', choices: ['public', 'with-bugs'], description: 'Target environment')
    choice(name: 'PROJECT', choices: ['all', 'chromium', 'firefox', 'webkit', 'mobile-chrome'], description: 'Browser project')
    string(name: 'GREP', defaultValue: '', description: 'Optional tag filter, e.g. @smoke')  }

  options {
    timeout(time: 45, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
    disableConcurrentBuilds()
  }

  triggers {
    cron('H 1 * * *')
  }

  environment {
    CI = 'true'
    TEST_ENV = "${params.TEST_ENV}"
    ALLURE = '1'
    ADMIN_PASSWORD = credentials('toolshop-admin-password')
    HUSKY = '0'  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }
    stage('Quality gate') {
      steps {
        sh 'npm run typecheck'
        sh 'npm run lint'
        sh 'npm run format:check'
        sh 'node scripts/agent-parity.mts'
      }
    }
    stage('UI tests') {
      steps {
        sh """npx playwright test ${params.PROJECT == 'all' ? '' : "--project=${params.PROJECT}"} ${params.GREP ? "--grep '${params.GREP}'" : ''}"""
      }
    }
  }

  post {
    always {
      // The workspace keeps allure-history/ and coverage-history/ between builds for the trends
      sh 'scripts/ci/build-site.sh || true'
      junit allowEmptyResults: true, testResults: 'test-results/junit.xml'
      publishHTML(target: [
        reportName: 'Automation Dashboard',
        reportDir: 'site',
        reportFiles: 'index.html',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true,
      ])
      publishHTML(target: [
        reportName: 'Allure',
        reportDir: 'site/allure',
        reportFiles: 'index.html',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true,
      ])
      publishHTML(target: [
        reportName: 'Playwright',
        reportDir: 'site/playwright',
        reportFiles: 'index.html',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true,
      ])
      archiveArtifacts artifacts: 'site/**, test-results/**', allowEmptyArchive: true
      // allure includeProperties: false, results: [[path: 'allure-results']]   // with the Allure plugin
    }
  }
}
